// L6 (doc 53, B4): fixed retrieval set for choosing the embedding model.
// Synthetic documents of a fictional client (UrbanStride) in Portuguese and
// English; each question names a phrase that only the right passage
// contains. Changing the set changes RETRIEVAL_SET_VERSION.

export const RETRIEVAL_SET_VERSION = "1.0.0";

export const RETRIEVAL_DOCUMENTS = [
  {
    title: "Ficha técnica — UrbanStride Daily",
    content: `A UrbanStride Daily tem a parte de cima em malha de poliéster reciclado, com 12 garrafas de plástico reutilizadas em cada par.

A sola exterior é de borracha natural com padrão em espinha, pensada para pavimentos molhados de calçada portuguesa.

A palmilha amovível é de espuma de cortiça e pode ser lavada à mão em água fria.

O peso de cada sapato no tamanho 42 é de 280 gramas.

Os tamanhos disponíveis vão do 36 ao 46, sem meios números.`,
  },
  {
    title: "Política de devoluções",
    content: `As devoluções são gratuitas durante 30 dias após a entrega, desde que o calçado não tenha sido usado na rua.

O reembolso é feito no mesmo método de pagamento, até 5 dias úteis depois de recebermos a devolução no armazém de Alverca.

Trocas de tamanho não pagam portes e podem ser pedidas pela área de cliente.

Artigos em promoção de fim de coleção não podem ser devolvidos, só trocados.`,
  },
  {
    title: "Envios",
    content: `Enviamos para Portugal continental em 2 dias úteis através da CTT Expresso.

Para os Açores e a Madeira o prazo é de 4 a 6 dias úteis e os portes custam 6,90 euros.

Encomendas acima de 60 euros têm portes grátis em Portugal continental.

Não fazemos envios para fora da União Europeia.`,
  },
  {
    title: "Care guide",
    content: `Brush off dry mud with a soft brush before cleaning the upper.

Clean the knit upper with lukewarm water and a drop of neutral soap; never put the shoes in the washing machine.

Let the shoes dry away from radiators and direct sunlight, with newspaper inside to keep their shape.

Replace the cork insole every 12 months of daily use.`,
  },
  {
    title: "Warranty",
    content: `Every pair has a two-year warranty against manufacturing defects such as sole separation or broken seams.

The warranty does not cover normal wear of the outsole tread.

To make a claim, send photos of the defect and the order number to the support email.`,
  },
] as const;

export type RetrievalQuestion = Readonly<{
  id: string;
  language: "pt" | "en" | "cross";
  question: string;
  // A phrase that only the correct passage contains.
  expect: string;
}>;

export const RETRIEVAL_QUESTIONS: readonly RetrievalQuestion[] = [
  {
    id: "pt-1",
    language: "pt",
    question: "De que material é feita a parte de cima do sapato?",
    expect: "poliéster reciclado",
  },
  {
    id: "pt-2",
    language: "pt",
    question: "A sola aguenta chão molhado?",
    expect: "pavimentos molhados",
  },
  {
    id: "pt-3",
    language: "pt",
    question: "Posso lavar a palmilha?",
    expect: "lavada à mão",
  },
  {
    id: "pt-4",
    language: "pt",
    question: "Quanto pesa cada sapato?",
    expect: "280 gramas",
  },
  {
    id: "pt-5",
    language: "pt",
    question: "Há meios números?",
    expect: "sem meios números",
  },
  {
    id: "pt-6",
    language: "pt",
    question: "Quanto tempo tenho para devolver?",
    expect: "30 dias",
  },
  {
    id: "pt-7",
    language: "pt",
    question: "Quando recebo o dinheiro de volta?",
    expect: "5 dias úteis",
  },
  {
    id: "pt-8",
    language: "pt",
    question: "Posso devolver um artigo comprado em saldos?",
    expect: "fim de coleção",
  },
  {
    id: "pt-9",
    language: "pt",
    question: "Quanto custa enviar para a Madeira?",
    expect: "6,90 euros",
  },
  {
    id: "pt-10",
    language: "pt",
    question: "A partir de que valor os portes são grátis?",
    expect: "acima de 60 euros",
  },
  {
    id: "pt-11",
    language: "pt",
    question: "Enviam para o Brasil?",
    expect: "fora da União Europeia",
  },
  {
    id: "pt-12",
    language: "pt",
    question: "Em quanto tempo chega uma encomenda a Lisboa?",
    expect: "2 dias úteis",
  },
  {
    id: "en-1",
    language: "en",
    question: "Can I put the shoes in the washing machine?",
    expect: "washing machine",
  },
  {
    id: "en-2",
    language: "en",
    question: "How should I dry them after cleaning?",
    expect: "away from radiators",
  },
  {
    id: "en-3",
    language: "en",
    question: "How often should the insole be replaced?",
    expect: "every 12 months",
  },
  {
    id: "en-4",
    language: "en",
    question: "How long is the warranty?",
    expect: "two-year warranty",
  },
  {
    id: "en-5",
    language: "en",
    question: "Is a worn-out sole covered?",
    expect: "normal wear",
  },
  {
    id: "en-6",
    language: "en",
    question: "What do I need to send to claim the warranty?",
    expect: "photos of the defect",
  },
  {
    id: "x-1",
    language: "cross",
    question: "What is the upper made of?",
    expect: "poliéster reciclado",
  },
  {
    id: "x-2",
    language: "cross",
    question: "How many days do I have to return a pair?",
    expect: "30 dias",
  },
  {
    id: "x-3",
    language: "cross",
    question: "Do you ship outside the EU?",
    expect: "fora da União Europeia",
  },
  {
    id: "x-4",
    language: "cross",
    question: "How much does a shoe weigh?",
    expect: "280 gramas",
  },
  {
    id: "x-5",
    language: "cross",
    question: "Como limpo a parte de malha?",
    expect: "lukewarm water",
  },
  {
    id: "x-6",
    language: "cross",
    question: "A garantia cobre o desgaste da sola?",
    expect: "normal wear",
  },
];
