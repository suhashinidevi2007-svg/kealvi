"use client";

import { useEffect, useState } from "react";
import { getVoterId } from "@/lib/voter";

type Question = {
  id: string;
  body: string;
  author: string | null;
  ask_count: number;
  votes: number;
  answer?: string | null;
};

export default function QuestionsList({
  initialQuestions,
  initialHasMore,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] =
    useState<Question[]>(initialQuestions);

  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  const [hasMore, setHasMore] =
    useState(initialHasMore);

  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);

  const [error, setError] = useState("");

  const [aiAnswer, setAiAnswer] = useState("");
  const [answeredQuestion, setAnsweredQuestion] =
    useState("");

  const [votedQuestions, setVotedQuestions] =
    useState<Record<string, boolean>>({});

  // --------------------------------------------------
  // Search questions
  // --------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const url = query
          ? `/api/questions?q=${encodeURIComponent(query)}`
          : `/api/questions`;

        const res = await fetch(url, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(
            "Failed to load questions."
          );
        }

        const data = await res.json();

        setQuestions(data.questions ?? []);
        setHasMore(data.hasMore ?? false);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // --------------------------------------------------
  // Ask question + Gemini answer
  // --------------------------------------------------

  async function submit() {
    const questionText = draft.trim();

    if (!questionText || asking) {
      return;
    }

    setAsking(true);
    setError("");
    setAiAnswer("");
    setAnsweredQuestion("");

    try {
      // ----------------------------------------------
      // Save question / increment ask count
      // ----------------------------------------------

      const questionRes = await fetch(
        "/api/questions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: questionText,
          }),
        }
      );

      const questionData =
        await questionRes.json();

      if (!questionRes.ok) {
        throw new Error(
          questionData.error ||
            "Failed to save the question."
        );
      }

      // Clear input
      setDraft("");

      // ----------------------------------------------
      // Ask Gemini
      // ----------------------------------------------

      const geminiRes = await fetch(
        "/api/questions/ask",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: questionText,
          }),
        }
      );

      const geminiData =
        await geminiRes.json();

      if (!geminiRes.ok) {
        throw new Error(
          geminiData.error ||
            "Failed to generate Gemini answer."
        );
      }

      // ----------------------------------------------
      // Display Gemini answer separately
      // ----------------------------------------------

      setAnsweredQuestion(questionText);

      setAiAnswer(
        geminiData.answer ||
          "No answer generated."
      );

      // ----------------------------------------------
      // Refresh questions
      // ----------------------------------------------

      const refreshRes = await fetch(
        "/api/questions",
        {
          cache: "no-store",
        }
      );

      if (refreshRes.ok) {
        const refreshData =
          await refreshRes.json();

        setQuestions(
          refreshData.questions ?? []
        );

        setHasMore(
          refreshData.hasMore ?? false
        );
      }
    } catch (err) {
      console.error("Submit error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setAsking(false);
    }
  }

  // --------------------------------------------------
  // Upvote question
  // --------------------------------------------------

  async function upvote(id: string) {
    // Don't allow another click if already voted
    if (votedQuestions[id]) {
      return;
    }

    // Optimistically increase displayed count
    setQuestions((currentQuestions) =>
      currentQuestions.map((q) =>
        q.id === id
          ? {
              ...q,
              votes: q.votes + 1,
            }
          : q
      )
    );

    try {
      const voterId = getVoterId();

      const res = await fetch(
        `/api/questions/${id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voterId,
          }),
        }
      );

      const data = await res.json();

      // ----------------------------------------------
      // Already voted
      // ----------------------------------------------

      if (res.status === 409) {
        console.log(
          "This question was already upvoted."
        );

        // Roll back optimistic increase because
        // the database already had the vote.
        setQuestions((currentQuestions) =>
          currentQuestions.map((q) =>
            q.id === id
              ? {
                  ...q,
                  votes: Math.max(
                    0,
                    q.votes - 1
                  ),
                }
              : q
          )
        );

        // Disable the button
        setVotedQuestions((current) => ({
          ...current,
          [id]: true,
        }));

        return;
      }

      // ----------------------------------------------
      // Other errors
      // ----------------------------------------------

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to upvote question."
        );
      }

      // ----------------------------------------------
      // Vote successfully saved
      // ----------------------------------------------

      setVotedQuestions((current) => ({
        ...current,
        [id]: true,
      }));

      console.log(
        "Upvote successful:",
        data
      );
    } catch (err) {
      console.error(
        "Vote error:",
        err
      );

      // Roll back optimistic count
      setQuestions((currentQuestions) =>
        currentQuestions.map((q) =>
          q.id === id
            ? {
                ...q,
                votes: Math.max(
                  0,
                  q.votes - 1
                ),
              }
            : q
        )
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to upvote question."
      );
    }
  }

  // --------------------------------------------------
  // Load more questions
  // --------------------------------------------------

  async function loadMore() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/questions?offset=${questions.length}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to load more questions."
        );
      }

      const data = await res.json();

      setQuestions((currentQuestions) => {
        const existingIds = new Set(
          currentQuestions.map((q) => q.id)
        );

        const newQuestions =
          (data.questions ?? []).filter(
            (q: Question) =>
              !existingIds.has(q.id)
          );

        return [
          ...currentQuestions,
          ...newQuestions,
        ];
      });

      setHasMore(
        data.hasMore ?? false
      );
    } catch (err) {
      console.error(
        "Load more error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load more questions."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // Press Enter to ask
  // --------------------------------------------------

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-5">

      {/* -------------------------------------------- */}
      {/* Ask Question Box */}
      {/* -------------------------------------------- */}

      <div className="rounded-2xl border bg-surface p-4 shadow-sm">
        <div className="flex gap-2">

          <input
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={asking}
            placeholder="Ask a question..."
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand disabled:opacity-60"
          />

          <button
            onClick={submit}
            disabled={
              asking || !draft.trim()
            }
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {asking
              ? "Asking..."
              : "Ask"}
          </button>

        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* ------------------------------------------ */}
        {/* Gemini Answer */}
        {/* ------------------------------------------ */}

        {aiAnswer && (
          <div className="mt-4 rounded-xl border bg-background p-4">

            <p className="text-xs font-semibold text-brand">
              Gemini
            </p>

            {answeredQuestion && (
              <p className="mt-1 text-xs text-muted">
                Question: {answeredQuestion}
              </p>
            )}

            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {aiAnswer}
            </p>

          </div>
        )}

      </div>

      {/* -------------------------------------------- */}
      {/* Search */}
      {/* -------------------------------------------- */}

      <div className="flex items-center gap-3">

        <input
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
          placeholder="Search questions..."
          className="w-full flex-1 rounded-xl border bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
        />

        <span className="shrink-0 text-xs text-muted">
          Interactive
        </span>

      </div>

      {/* -------------------------------------------- */}
      {/* Questions List */}
      {/* -------------------------------------------- */}

      <ul className="space-y-3">

        {questions.map((q) => (
          <li
            key={q.id}
            className="rounded-2xl border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >

            <div className="flex items-start gap-3">

              {/* ------------------------------------ */}
              {/* Upvote Button */}
              {/* ------------------------------------ */}

              <button
                onClick={() =>
                  upvote(q.id)
                }
                disabled={
                  !!votedQuestions[q.id]
                }
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3.5 py-2 transition-colors ${
                  votedQuestions[q.id]
                    ? "cursor-not-allowed border-brand bg-brand-soft text-brand"
                    : "text-brand hover:border-brand hover:bg-brand-soft"
                }`}
                title={
                  votedQuestions[q.id]
                    ? "You already upvoted this question"
                    : "Upvote question"
                }
              >

                <span className="text-xs leading-none">
                  ▲
                </span>

                <span className="text-sm font-semibold leading-none tabular-nums">
                  {q.votes}
                </span>

              </button>

              {/* ------------------------------------ */}
              {/* Question Content */}
              {/* ------------------------------------ */}

              <div className="min-w-0 flex-1 pt-0.5">

                <p className="leading-snug">
                  {q.body}
                </p>

                {/* Ask count */}
                <p className="mt-1.5 text-xs text-muted">
                  Asked{" "}
                  {q.ask_count ?? 1}{" "}
                  {(q.ask_count ?? 1) === 1
                    ? "time"
                    : "times"}
                </p>

                {/* Author */}
                {q.author && (
                  <p className="mt-1 text-xs text-muted">
                    Asked by {q.author}
                  </p>
                )}

                {/* Existing answer if available */}
                {q.answer && (
                  <div className="mt-3 rounded-xl border bg-background p-3">

                    <p className="mb-1 text-xs font-semibold text-brand">
                      Gemini
                    </p>

                    <p className="text-sm leading-relaxed text-foreground">
                      {q.answer}
                    </p>

                  </div>
                )}

              </div>

            </div>

          </li>
        ))}

      </ul>

      {/* -------------------------------------------- */}
      {/* No Questions */}
      {/* -------------------------------------------- */}

      {questions.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted">
          {query
            ? "No matching questions found."
            : "No questions yet — be the first to ask."}
        </p>
      )}

      {/* -------------------------------------------- */}
      {/* Load More */}
      {/* -------------------------------------------- */}

      {hasMore && (
        <div className="flex justify-center">

          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Loading..."
              : "Load more"}
          </button>

        </div>
      )}

    </div>
  );
}