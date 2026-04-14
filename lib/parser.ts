import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { defaultStructuredLog } from "@/lib/demo-data";
import { ParseRequestPayload, ParseResponsePayload, StructuredLog } from "@/lib/types";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const parserModel = process.env.OPENAI_PARSER_MODEL ?? "gpt-4.1-mini";
const transcribeModel = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe";

const KEYWORDS = {
  food: {
    dairy: ["milk", "paneer", "cheese", "yogurt", "curd", "ice cream"],
    sugar: ["dessert", "sweet", "cake", "brownie", "chocolate", "sugar"],
    spicy: ["spicy", "chilli", "masala", "tikka", "schezwan"],
    fried: ["fried", "fries", "pakoda", "chips"],
    caffeine: ["coffee", "chai", "matcha"]
  },
  skincare: {
    cleanser: ["face wash", "cleanser"],
    serum: ["serum", "niacinamide", "vitamin c"],
    moisturizer: ["moisturizer", "cream"],
    sunscreen: ["spf", "sunscreen"]
  },
  symptoms: {
    pimples: ["pimple", "breakout", "acne", "zit"],
    redness: ["red", "redness"],
    oiliness: ["oily", "oiliness"],
    itchiness: ["itch", "itchy"]
  },
  lifestyle: {
    stress: ["stress", "stressed", "anxious"],
    sleep: ["sleep", "slept", "late night"],
    workout: ["gym", "workout", "run", "walk"]
  }
};

function extractKeywordMatches(input: string, terms: Record<string, string[]>): string[] {
  return Object.entries(terms)
    .filter(([, variants]) => variants.some((term) => input.includes(term)))
    .map(([label]) => label);
}

function heuristicallyParse(rawText: string): StructuredLog {
  const normalized = rawText.toLowerCase();
  const foodTags = extractKeywordMatches(normalized, KEYWORDS.food);
  const skincareSteps = extractKeywordMatches(normalized, KEYWORDS.skincare);
  const skinSymptoms = extractKeywordMatches(normalized, KEYWORDS.symptoms);
  const lifestyleSignals = extractKeywordMatches(normalized, KEYWORDS.lifestyle);

  return {
    foodTags: foodTags.length ? foodTags : defaultStructuredLog.foodTags,
    foodNotes: rawText || defaultStructuredLog.foodNotes,
    skincareSteps: skincareSteps.length ? skincareSteps : defaultStructuredLog.skincareSteps,
    skinSymptoms: skinSymptoms.length ? skinSymptoms : defaultStructuredLog.skinSymptoms,
    lifestyleSignals: lifestyleSignals.length ? lifestyleSignals : defaultStructuredLog.lifestyleSignals,
    adherenceStatus: normalized.includes("missed") ? "missed" : normalized.includes("late") ? "partial" : "done",
    confidence: rawText ? 0.74 : defaultStructuredLog.confidence,
    summary: rawText
      ? "Auto-parsed from your note. Review once and confirm if it looks right."
      : defaultStructuredLog.summary,
    followUpPrompt: "Anything important the app should remember for tomorrow?"
  };
}

async function transcribeAudio(payload: ParseRequestPayload): Promise<string> {
  const voiceAttachment = payload.attachments.find((item) => item.kind === "voice_note");
  if (!voiceAttachment?.dataUrl || !openai) {
    return "";
  }

  const [, base64Content = ""] = voiceAttachment.dataUrl.split(",");
  const buffer = Buffer.from(base64Content, "base64");
  const file = await toFile(buffer, voiceAttachment.name || "check-in.webm", {
    type: voiceAttachment.mimeType || "audio/webm"
  });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: transcribeModel
  });

  return transcription.text ?? "";
}

function buildPrompt(payload: ParseRequestPayload, transcript: string) {
  const attachmentContext = payload.attachments
    .map((item) => `${item.kind}${item.caption ? ` (${item.caption})` : ""}`)
    .join(", ");

  return [
    "You are helping an acne-treatment habit tracker convert a user's raw daily check-in into structured data.",
    "Return only valid JSON with the following exact keys:",
    "foodTags, foodNotes, skincareSteps, skinSymptoms, lifestyleSignals, adherenceStatus, confidence, summary, followUpPrompt.",
    'adherenceStatus must be one of "done", "partial", or "missed".',
    "foodTags, skincareSteps, skinSymptoms, lifestyleSignals must each be arrays of short strings.",
    "confidence must be a number between 0 and 1.",
    "Keep the summary concise and human-readable.",
    "",
    `Entry date: ${payload.entryDate}`,
    `Free text: ${payload.rawText || "None"}`,
    `Transcribed voice note: ${transcript || "None"}`,
    `Attachment context: ${attachmentContext || "None"}`
  ].join("\n");
}

async function parseWithOpenAI(payload: ParseRequestPayload, transcript: string): Promise<StructuredLog> {
  if (!openai) {
    return heuristicallyParse([payload.rawText, transcript].filter(Boolean).join(" "));
  }

  const content: Array<{
    role: "user";
    content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }>;
  }> = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: buildPrompt(payload, transcript)
        }
      ]
    }
  ];

  for (const attachment of payload.attachments.filter((item) => item.kind !== "voice_note")) {
    content[0].content.push({
      type: "input_image",
      image_url: attachment.dataUrl
    });
  }

  const response = await openai.responses.create({
    model: parserModel,
    input: content as never
  });

  const text = response.output_text?.trim();
  if (!text) {
    return heuristicallyParse([payload.rawText, transcript].filter(Boolean).join(" "));
  }

  const cleanedText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleanedText) as StructuredLog;
  return {
    foodTags: parsed.foodTags ?? [],
    foodNotes: parsed.foodNotes ?? "",
    skincareSteps: parsed.skincareSteps ?? [],
    skinSymptoms: parsed.skinSymptoms ?? [],
    lifestyleSignals: parsed.lifestyleSignals ?? [],
    adherenceStatus: parsed.adherenceStatus ?? "done",
    confidence: parsed.confidence ?? 0.82,
    summary: parsed.summary ?? "Your day has been structured into a quick log.",
    followUpPrompt: parsed.followUpPrompt ?? "Anything else you want the tracker to remember?"
  };
}

export async function parseHabitEntry(payload: ParseRequestPayload): Promise<ParseResponsePayload> {
  const transcript = await transcribeAudio(payload).catch(() => "");
  const mergedText = [payload.rawText, transcript, payload.attachments.map((item) => item.caption).join(" ")]
    .filter(Boolean)
    .join(" ");

  const structuredLog = await parseWithOpenAI(
    {
      ...payload,
      rawText: mergedText
    },
    transcript
  ).catch(() => heuristicallyParse(mergedText));

  return {
    structuredLog,
    transcript
  };
}
