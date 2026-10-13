import { useState } from "react";
import { View } from "react-native";
import { Sheet } from "./sheet";
import { Button, ErrorText, Field } from "./ui";

/** Saisie d'un nom (nouveau dossier, renommer…). Remonté à chaque ouverture (clé). */
export function PromptSheet({
  visible,
  title,
  label,
  initial = "",
  confirmLabel,
  selectBase = false,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  label?: string;
  initial?: string;
  confirmLabel: string;
  /** Sélectionne le nom sans l'extension (renommage d'un fichier). */
  selectBase?: boolean;
  onClose: () => void;
  /** Renvoie un message d'erreur, ou null en cas de succès. */
  onSubmit: (value: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dot = initial.lastIndexOf(".");
  // Sélection initiale seulement : ensuite le curseur est libre.
  const [selection, setSelection] = useState(selectBase && dot > 0 ? { start: 0, end: dot } : undefined);

  async function submit() {
    setBusy(true);
    setError(null);
    const message = await onSubmit(value);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Field
          label={label}
          value={value}
          onChangeText={setValue}
          autoFocus
          selection={selection}
          onSelectionChange={() => selection && setSelection(undefined)}
          returnKeyType="done"
          onSubmitEditing={submit}
          maxLength={255}
        />
        <ErrorText>{error}</ErrorText>
        <Button label={confirmLabel} onPress={submit} loading={busy} disabled={!value.trim()} />
      </View>
    </Sheet>
  );
}
