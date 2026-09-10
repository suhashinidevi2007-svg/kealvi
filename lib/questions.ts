import { supabase } from "@/lib/supabase";

export async function getQuestionsPage(
  offset: number,
  limit: number
) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, body, author, created_at, ask_count, votes(count)"
    )
    .order("created_at", {
      ascending: false,
    })
    .range(offset, offset + limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    author: q.author,
    ask_count: q.ask_count ?? 1,
    votes: q.votes?.[0]?.count ?? 0,
  }));

  const hasMore = rows.length > limit;

  return {
    questions: rows.slice(0, limit),
    hasMore,
  };
}


/*
 * SEARCH QUESTIONS
 *
 * Uses ILIKE instead of textSearch().
 *
 * This searches for the typed text anywhere
 * inside the question body.
 */
export async function searchQuestions(
  q: string,
  limit: number
) {
  const searchText = q.trim();

  if (!searchText) {
    return [];
  }

  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, body, author, created_at, ask_count, votes(count)"
    )
    .ilike("body", `%${searchText}%`)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    author: row.author,
    ask_count: row.ask_count ?? 1,
    votes: row.votes?.[0]?.count ?? 0,
  }));
}