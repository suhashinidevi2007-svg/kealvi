import { getSupabase } from "@/lib/supabase";

type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  created_at: string;
};

type PollVoteRow = {
  id: string;
  poll_id: string;
  poll_option_id: string;
  voter_id: string;
};

export async function GET() {
  try {
    // Get all polls
    const { data: polls, error: pollsError } =
      await getSupabase()
        .from("polls")
        .select("id, question, multiple, created_at")
        .order("created_at", {
          ascending: false,
        });

    if (pollsError) {
      console.error("Polls fetch error:", pollsError);

      return Response.json(
        {
          error: pollsError.message,
        },
        {
          status: 500,
        }
      );
    }

    // Get options for all polls
    const pollIds = (polls ?? []).map(
      (poll) => poll.id
    );

    let options: PollOptionRow[] = [];

    if (pollIds.length > 0) {
      const { data: optionData, error: optionsError } =
        await getSupabase()
          .from("poll_options")
          .select(
            "id, poll_id, label, created_at"
          )
          .in("poll_id", pollIds)
          .order("created_at", {
            ascending: true,
          });

      if (optionsError) {
        console.error(
          "Poll options fetch error:",
          optionsError
        );

        return Response.json(
          {
            error: optionsError.message,
          },
          {
            status: 500,
          }
        );
      }

      options = (optionData ?? []) as PollOptionRow[];
    }

    // Get votes for all polls
    let votes: PollVoteRow[] = [];

    if (pollIds.length > 0) {
      const { data: voteData, error: votesError } =
        await getSupabase()
          .from("poll_votes")
          .select(
            "id, poll_id, poll_option_id, voter_id"
          )
          .in("poll_id", pollIds);

      if (votesError) {
        console.error(
          "Poll votes fetch error:",
          votesError
        );

        return Response.json(
          {
            error: votesError.message,
          },
          {
            status: 500,
          }
        );
      }

      votes = (voteData ?? []) as PollVoteRow[];
    }

    // Format the polls for the frontend
    const formattedPolls = (polls ?? []).map(
      (poll) => {
        const pollOptions = options
          .filter(
            (option) =>
              option.poll_id === poll.id
          )
          .map((option) => {
            const optionVotes = votes.filter(
              (vote) =>
                vote.poll_id === poll.id &&
                vote.poll_option_id ===
                  option.id
            ).length;

            return {
              id: option.id,
              label: option.label,
              votes: optionVotes,
            };
          });

        const totalVotes = votes.filter(
          (vote) =>
            vote.poll_id === poll.id
        ).length;

        return {
          id: poll.id,
          question: poll.question,
          multiple: poll.multiple ?? false,
          options: pollOptions,
          totalVotes,
          createdAt: poll.created_at,
        };
      }
    );

    return Response.json({
      polls: formattedPolls,
    });
  } catch (error) {
    console.error(
      "GET /api/polls error:",
      error
    );

    return Response.json(
      {
        error: "Failed to load polls.",
      },
      {
        status: 500,
      }
    );
  }
}