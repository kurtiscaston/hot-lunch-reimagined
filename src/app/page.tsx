import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCHOOL_NAME } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Badge variant="secondary">Portfolio concept</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Hot lunch, run from a phone.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          {SCHOOL_NAME} families order meals before a cutoff. Volunteers keep
          vendor totals and payments in one workspace instead of a fresh
          spreadsheet every week.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sample data only</CardTitle>
          <CardDescription>
            Households, students, menus, and vendors in this demo are fictional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed">
            The header switcher moves between the parent view and the volunteer
            workspace. It is a demo control, not an account sign-in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
