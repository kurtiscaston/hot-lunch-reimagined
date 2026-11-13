import { HomeBoard } from "@/components/home-board";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[30px] leading-none font-extrabold tracking-tight md:text-[40px]">
          Welcome back
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-2">
          Your family&apos;s school lunches, in one place.
        </p>
      </div>
      <HomeBoard />
    </div>
  );
}
