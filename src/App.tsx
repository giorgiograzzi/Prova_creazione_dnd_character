import it from "./i18n/it.json";
import { ReloadPrompt } from "./ui/ReloadPrompt";

export function App() {
  return (
    <>
      <h1>{it.app.title}</h1>
      <ReloadPrompt />
    </>
  );
}
