import { supabase } from "@/lib/supabase";
import { getQuestionsPage, searchQuestions } from "@/lib/questions";

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();

    // -----------------------------
    // SEARCH QUESTIONS
    // -----------------------------
    if (q) {
      const questions = await searchQuestions(q, PAGE_SIZE);

      return Response.json({
        questions,
        hasMore: false,
      });
    }

    // -----------------------------
    // PAGINATION
    // -----------------------------
    const offsetValue = searchParams.get("offset") ?? "0";
    const offset = Number(offsetValue);

    if (!Number.isInteger(offset) || offset < 0) {
      return Response.json(
        {
          error: "Invalid offset.",
        },
        {
          status: 400,
        }
      );
    }

    const { questions, hasMore } = await getQuestionsPage(
      offset,
      PAGE_SIZE
    );

    return Response.json({
      questions,
      hasMore,
    });
  } catch (error) {
    console.error("GET /api/questions error:", error);

    return Response.json(
      {
        error: "Failed to load questions.",
      },
      {
        status: 500,
      }
    );
  }
}

// -----------------------------
// CREATE QUESTION
// -----------------------------

export async function POST(req: Request) {
  try {
    const { body, author } = await req.json();

    if (!body?.trim()) {
      return Response.json(
        {
          error: "Question is required.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanBody = body.trim();

    const { data, error } = await supabase
      .from("questions")
      .insert({
        body: cleanBody,
        author,
      })
      .select()
      .single();

    if (error) {
      console.error("Question insert error:", error);

      return Response.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error("POST /api/questions error:", error);

    return Response.json(
      {
        error: "Failed to save question.",
      },
      {
        status: 500,
      }
    );
  }
}