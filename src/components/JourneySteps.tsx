import { copy } from "@/lib/copy";

/**
 * The builder journey, pinned to the top of every change so nobody has to
 * guess what a screen is for or what happens next (steps: Build → Pull →
 * Review & submit → Checks → Promote). `current` is 1-based; `done` renders
 * the whole journey complete.
 */
export function JourneySteps({ current, done = false, note }: { current: number; done?: boolean; note?: string }) {
  const steps = copy.journey.steps;
  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {steps.map((label, i) => {
          const n = i + 1;
          const state = done || n < current ? "done" : n === current ? "current" : "todo";
          return (
            <li key={label} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`mx-1 h-px w-4 sm:w-8 ${
                    done || n <= current ? "bg-indigo-400" : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                />
              )}
              <span
                className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-medium ${
                  state === "current"
                    ? "bg-indigo-600 text-white"
                    : state === "done"
                      ? "text-indigo-700 dark:text-indigo-300"
                      : "text-zinc-400"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                    state === "current"
                      ? "bg-white/20"
                      : state === "done"
                        ? "bg-indigo-100 dark:bg-indigo-900/50"
                        : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {state === "done" ? "✓" : n}
                </span>
                {label}
              </span>
            </li>
          );
        })}
        {done && (
          <li className="ml-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            ✓ {copy.journey.done}
          </li>
        )}
      </ol>
      {note && <p className="mt-2 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}
