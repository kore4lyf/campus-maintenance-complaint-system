import { connect } from "@/lib/db/connection";
import { CategoryModel } from "@/lib/db/models/category";
import { LocationModel } from "@/lib/db/models/location";
import { requireRole } from "@/lib/auth/dal";
import { ComplaintForm } from "./ComplaintForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CategoryOption {
  id: string;
  name: string;
  systemType: string;
}

interface LocationOption {
  id: string;
  name: string;
  area: string;
}

async function loadFormData(): Promise<{
  categories: CategoryOption[];
  locations: LocationOption[];
}> {
  await connect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categoryDocs, locationDocs] = await Promise.all([
    CategoryModel.find({}).sort({ systemType: 1 }).lean(),
    LocationModel.find({}).sort({ area: 1, name: 1 }).lean(),
  ]);
  const categories: CategoryOption[] = categoryDocs.map((c: any) => ({
    id: String(c._id),
    name: c.name,
    systemType: c.systemType,
  }));
  const locations: LocationOption[] = locationDocs.map((l: any) => ({
    id: String(l._id),
    name: l.name,
    area: l.area,
  }));
  return { categories, locations };
}

export default async function NewComplaintPage(): Promise<React.ReactElement> {
  await requireRole("reporter");
  const { categories, locations } = await loadFormData();

  return (
    <section className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Submit a complaint
        </h1>
        <p className="mt-1 text-sm text-muted-strong">
          Describe the maintenance issue, pick a category and location, attach a
          photo if relevant, and choose whether to submit anonymously.
        </p>
      </header>
      <ComplaintForm categories={categories} locations={locations} />
    </section>
  );
}
