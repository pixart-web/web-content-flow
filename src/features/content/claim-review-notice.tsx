// L6 B5 (doc 54): when the client's documents were used, the generation asks
// the model once to remove qualities those documents do not state. Words that
// survive that revision are shown here for a person to check; nothing is
// shown for content generated without client knowledge.

type ClaimReviewProvenance = Readonly<{
  knowledgeChunkIds?: readonly string[] | undefined;
  claimRevision?:
    | Readonly<{ flagged: readonly string[]; remaining: readonly string[] }>
    | undefined;
}>;

export function ClaimReviewNotice({
  provenance,
}: {
  provenance: ClaimReviewProvenance;
}) {
  const review = provenance.claimRevision;
  const passages = provenance.knowledgeChunkIds?.length ?? 0;
  if (review && review.remaining.length > 0)
    return (
      <section
        aria-labelledby="claim-review-title"
        className="border-border-warning bg-warning-subtle rounded-control border p-3 text-sm"
      >
        <h2 className="text-warning font-semibold" id="claim-review-title">
          Check these claims before using the text
        </h2>
        <p className="text-primary mt-1">
          The client’s documents don’t state{" "}
          {review.remaining.length === 1 ? "this quality" : "these qualities"}.
          An automatic revision ran, but the words remain:
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {review.remaining.map((term) => (
            <li
              className="border-border-warning bg-surface rounded-pill border px-2 py-0.5 font-medium"
              key={term}
            >
              {term}
            </li>
          ))}
        </ul>
        <p className="text-secondary mt-2">
          Remove them, or confirm them with the client and add the source to the
          project’s knowledge.
        </p>
      </section>
    );
  if (passages === 0) return null;
  const removed = review?.flagged.length ?? 0;
  return (
    <p className="bg-surface-subtle rounded-control text-secondary p-3 text-sm">
      Based on {passages} {passages === 1 ? "passage" : "passages"} from the
      client’s documents.
      {removed > 0
        ? ` ${removed} unsupported ${removed === 1 ? "claim was" : "claims were"} removed automatically.`
        : ""}
    </p>
  );
}
