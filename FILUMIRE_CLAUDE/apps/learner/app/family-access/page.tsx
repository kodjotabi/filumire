import { localFamilyAccessEnabled } from "../../../../services/family-access/otp";
import { FamilyAccessPrototype } from "../../components/filumire/FamilyAccessPrototype";

export const dynamic = "force-dynamic";
export default function FamilyAccessPage() {
  if (!localFamilyAccessEnabled()) return <main><h1>Family access / Accès familial</h1><p>This local prototype is unavailable here. / Ce prototype local n’est pas disponible ici.</p></main>;
  return <FamilyAccessPrototype />;
}
