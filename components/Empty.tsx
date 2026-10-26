export default function Empty({
  icon = "📄",
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 font-semibold text-stone-700">{title}</p>
      {hint && <p className="mt-0.5 text-sm text-stone-500">{hint}</p>}
    </div>
  );
}
