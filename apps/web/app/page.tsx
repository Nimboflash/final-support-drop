import { redirect } from "next/navigation";

/** DROP OS presents Studio as its active module under /studio (04 §2). */
export default function Home() {
  redirect("/studio");
}
