import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
     model: "gemini-3.6-flash",
      contents: `Answer the following question in exactly 2 short, simple sentences.
Do not give a long explanation.
Use clear language that a beginner can understand.

Question: ${question}`,
    });

    return NextResponse.json({
      answer: response.text?.trim() || "No answer was generated.",
    });
  } catch (error) {
    console.error("Gemini error:", error);

    return NextResponse.json(
      { error: "Failed to generate answer." },
      { status: 500 }
    );
  }
}