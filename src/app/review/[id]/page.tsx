import { ReviewerHub } from "@/components/study/reviewer-hub";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewerHub id={id} />;
}
