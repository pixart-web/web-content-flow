import {
  addKnowledgeDocumentAction,
  deleteKnowledgeDocumentAction,
} from "@/features/knowledge/knowledge-actions";
import { KnowledgeForm } from "@/features/knowledge/knowledge-form";
import { getServerEnv } from "@/lib/env/server";
import { requireProjectOwner } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";
import { listKnowledgeDocuments } from "@/server/knowledge/knowledge-service";

// L6 (doc 53): the client's own documents for this project — catalogues,
// price lists, FAQs, tone of voice. They stay on this computer and are only
// used for this project.
export default async function ProjectKnowledgePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await requireProjectOwner(projectId);
  const documents = await listKnowledgeDocuments(getPrisma(), projectId);
  const indexing = Boolean(getServerEnv().KNOWLEDGE_EMBEDDING_MODEL);
  return (
    <div className="max-w-4xl">
      <header>
        <p className="text-secondary text-sm">{project.name}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Knowledge</h1>
        <p className="text-secondary mt-3 max-w-prose">
          Documents from this client: catalogues, price lists, FAQs, care
          guides. They are used only for this project and never leave this
          computer.
        </p>
        {!indexing ? (
          <p
            className="border-default bg-surface-subtle rounded-control mt-4 border p-3 text-sm"
            role="status"
          >
            Documents are saved but not searchable yet: local knowledge needs
            the embedding model (bge-m3) on this computer.
          </p>
        ) : null}
      </header>
      <KnowledgeForm
        action={addKnowledgeDocumentAction.bind(null, projectId)}
      />
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-secondary mt-3 text-sm">No documents yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {documents.map((document) => (
              <li
                className="border-default bg-surface rounded-card flex flex-wrap items-center justify-between gap-3 border p-4"
                key={document.id}
              >
                <div>
                  <p className="font-semibold">{document.title}</p>
                  <p className="text-secondary text-sm">
                    {Math.ceil(document.byteSize / 1024)} KB ·{" "}
                    {document.indexedChunks}/{document.chunks} passages indexed
                  </p>
                </div>
                <form
                  action={deleteKnowledgeDocumentAction.bind(
                    null,
                    projectId,
                    document.id,
                  )}
                >
                  <button className="border-strong bg-surface hover:bg-surface-subtle rounded-control min-h-11 border px-4 text-sm font-semibold">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
