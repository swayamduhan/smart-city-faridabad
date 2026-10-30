import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1600px] px-2 pt-2 sm:px-3">
      <div className="plate on-sign px-8 py-14">
        <p className="hi text-2xl">रास्ता बंद है</p>
        <h1 className="display text-[clamp(3rem,10vw,8rem)]">Road closed</h1>
        <p className="mt-2 max-w-[44ch] text-lg">This page doesn&apos;t exist or has moved. Go back to the home page, or search from there.</p>
        <Link href="/" className="btn btn-mark mt-5">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
