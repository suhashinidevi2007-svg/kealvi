import { supabase } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const voterId = body?.voterId;

    if (!id) {
      return Response.json(
        { error: "Question ID is required." },
        { status: 400 }
      );
    }

    if (!voterId) {
      return Response.json(
        { error: "Voter ID is required." },
        { status: 400 }
      );
    }

    // Check that the question exists
    const { data: question, error: questionError } =
      await supabase
        .from("questions")
        .select("id")
        .eq("id", id)
        .single();

    if (questionError || !question) {
      console.error("Question lookup error:", questionError);

      return Response.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    // Check whether this voter already voted
    const { data: existingVote, error: existingVoteError } =
      await supabase
        .from("votes")
        .select("id")
        .eq("question_id", id)
        .eq("voter_id", voterId)
        .maybeSingle();

    if (existingVoteError) {
      console.error(
        "Existing vote lookup error:",
        existingVoteError
      );

      return Response.json(
        { error: existingVoteError.message },
        { status: 500 }
      );
    }

    if (existingVote) {
      return Response.json(
        {
          error: "You have already upvoted this question.",
        },
        { status: 409 }
      );
    }

    // Insert the vote
    const { data: vote, error: insertError } =
      await supabase
        .from("votes")
        .insert({
          question_id: id,
          voter_id: voterId,
          value: 1,
        })
        .select("id")
        .single();

    if (insertError) {
      console.error("Vote insert error:", insertError);

      if (insertError.code === "23505") {
        return Response.json(
          {
            error:
              "You have already upvoted this question.",
          },
          { status: 409 }
        );
      }

      return Response.json(
        {
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      voteId: vote.id,
      message: "Upvote recorded successfully.",
    });
  } catch (error) {
    console.error(
      "POST /api/questions/[id]/vote error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record vote.",
      },
      { status: 500 }
    );
  }
}