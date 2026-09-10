"use client";

import { useEffect, useState } from "react";
import { getVoterId } from "@/lib/voter";

type PollOption = {
  id: string;
  label: string;
  votes: number;
};

type Poll = {
  id: string;
  question: string;
  multiple: boolean;
  options: PollOption[];
  totalVotes: number;
  createdAt: string;
};

export default function Polls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({});
  const [votedPolls, setVotedPolls] = useState<Record<string, boolean>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load polls
  // --------------------------------------------------
  const loadPolls = async () => {
    try {
      setError("");

      const response = await fetch("/api/polls", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load polls.");
      }

      setPolls(data.polls || []);
    } catch (err) {
      console.error("Poll loading error:", err);
      setError("Failed to load polls.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Load polls when component starts
  // --------------------------------------------------
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPolls();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // --------------------------------------------------
  // Select / unselect option
  // --------------------------------------------------
  const handleOptionChange = (
    poll: Poll,
    optionId: string
  ) => {
    // Don't allow changes after voting
    if (votedPolls[poll.id]) {
      return;
    }

    setSelectedOptions((prev) => {
      const current = prev[poll.id] || [];

      // Multiple-choice poll
      if (poll.multiple) {
        if (current.includes(optionId)) {
          return {
            ...prev,
            [poll.id]: current.filter((id) => id !== optionId),
          };
        }

        return {
          ...prev,
          [poll.id]: [...current, optionId],
        };
      }

      // Single-choice poll
      return {
        ...prev,
        [poll.id]: [optionId],
      };
    });
  };

  // --------------------------------------------------
  // Submit vote
  // --------------------------------------------------
  const handleVote = async (poll: Poll) => {
    const selected = selectedOptions[poll.id] || [];

    if (selected.length === 0) {
      alert("Please select an option.");
      return;
    }

    if (votedPolls[poll.id]) {
      alert("You have already voted in this poll.");
      return;
    }

    try {
      setVotingPollId(poll.id);

      const voterId = getVoterId();

      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          optionIds: selected,
          voterId,
        }),
      });

      const data = await response.json();

      // --------------------------------------------------
      // Vote failed
      // --------------------------------------------------
      if (!response.ok) {
        if (response.status === 409) {
          setVotedPolls((prev) => ({
            ...prev,
            [poll.id]: true,
          }));

          alert(data.error || "You have already voted in this poll.");
          return;
        }

        throw new Error(data.error || "Failed to submit vote.");
      }

      // --------------------------------------------------
      // Vote successful
      // --------------------------------------------------
      setVotedPolls((prev) => ({
        ...prev,
        [poll.id]: true,
      }));

      // Clear selected option
      setSelectedOptions((prev) => ({
        ...prev,
        [poll.id]: [],
      }));

      alert("Vote submitted successfully!");

      // --------------------------------------------------
      // IMPORTANT:
      // Reload polls so vote count increases immediately
      // --------------------------------------------------
      await loadPolls();
    } catch (err) {
      console.error("Vote error:", err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to submit vote."
      );
    } finally {
      setVotingPollId(null);
    }
  };

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------
  if (loading) {
    return (
      <section className="mt-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Loading polls...
          </p>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // Error state
  // --------------------------------------------------
  if (error) {
    return (
      <section className="mt-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-600">{error}</p>

          <button
            onClick={() => {
              setLoading(true);
              loadPolls();
            }}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // No polls
  // --------------------------------------------------
  if (polls.length === 0) {
    return (
      <section className="mt-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Interactive Polls
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Share your opinion by voting in the polls.
          </p>

          <p className="mt-6 text-sm text-gray-500">
            No polls available.
          </p>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // Poll UI
  // --------------------------------------------------
  return (
    <section className="mt-10">
      {/* Section heading */}
      <div className="mb-5">
        <h2 className="text-2xl font-semibold tracking-tight">
          Interactive Polls
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Share your opinion by voting in the polls.
        </p>
      </div>

      {/* Poll cards */}
      <div className="space-y-6">
        {polls.map((poll) => {
          const selected = selectedOptions[poll.id] || [];
          const hasVoted = votedPolls[poll.id] || false;
          const isVoting = votingPollId === poll.id;

          return (
            <div
              key={poll.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              {/* Poll question */}
              <h3 className="text-lg font-semibold text-gray-900">
                {poll.question}
              </h3>

              {/* Multiple-choice information */}
              {poll.multiple && (
                <p className="mt-1 text-xs text-gray-500">
                  You can select multiple options.
                </p>
              )}

              {/* Options */}
              <div className="mt-5 space-y-3">
                {poll.options.map((option) => {
                  const isSelected = selected.includes(option.id);

                  const percentage =
                    poll.totalVotes > 0
                      ? Math.round(
                          (option.votes / poll.totalVotes) * 100
                        )
                      : 0;

                  return (
                    <div key={option.id}>
                      <button
                        type="button"
                        disabled={hasVoted}
                        onClick={() =>
                          handleOptionChange(
                            poll,
                            option.id
                          )
                        }
                        className={`relative w-full overflow-hidden rounded-xl border p-4 text-left transition ${
                          hasVoted
                            ? "cursor-default"
                            : "cursor-pointer hover:border-gray-400"
                        } ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        {/* Percentage background after voting */}
                        {hasVoted && (
                          <div
                            className="absolute inset-y-0 left-0 opacity-10"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: "currentColor",
                            }}
                          />
                        )}

                        <div className="relative flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Radio / checkbox */}
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                                poll.multiple
                                  ? "rounded"
                                  : "rounded-full"
                              } ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-gray-400 bg-white"
                              }`}
                            >
                              {isSelected && (
                                <span className="text-xs font-bold text-white">
                                  ✓
                                </span>
                              )}
                            </span>

                            {/* Option label */}
                            <span className="text-sm font-medium text-gray-800">
                              {option.label}
                            </span>
                          </div>

                          {/* Vote count */}
                          <span className="shrink-0 text-sm font-medium text-gray-500">
                            {option.votes}{" "}
                            {option.votes === 1
                              ? "vote"
                              : "votes"}
                          </span>
                        </div>

                        {/* Percentage */}
                        {hasVoted && (
                          <div className="relative mt-2 text-right text-xs text-gray-500">
                            {percentage}%
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Total votes */}
              <div className="mt-4 text-xs text-gray-500">
                Total votes: {poll.totalVotes}
              </div>

              {/* Vote button */}
              {!hasVoted ? (
                <button
                  type="button"
                  disabled={
                    isVoting || selected.length === 0
                  }
                  onClick={() => handleVote(poll)}
                  className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
                    isVoting || selected.length === 0
                      ? "cursor-not-allowed bg-gray-300"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isVoting ? "Submitting..." : "Vote"}
                </button>
              ) : (
                <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
                  ✓ You have voted in this poll
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}