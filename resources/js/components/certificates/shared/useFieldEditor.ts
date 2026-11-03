// src/components/certificates/shared/useFieldEditor.ts

import { useState, useCallback } from "react";
import type { EditFieldConfig } from "./EditFieldModal";

interface UseFieldEditorOptions {
  onSaveField: (key: string, value: string) => void;
  onSaveOrgField: (key: string, value: string) => void;
  onSaveMemberField: (
    index: number,
    key: "name" | "committee",
    value: string,
  ) => void;
}

export function useFieldEditor({
  onSaveField,
  onSaveOrgField,
  onSaveMemberField,
}: UseFieldEditorOptions) {
  const [config, setConfig] = useState<EditFieldConfig | null>(null);
  const [initialValue, setInitialValue] = useState("");

  const openEditor = useCallback(
    (cfg: EditFieldConfig, current: string) => {
      setConfig(cfg);
      setInitialValue(current);
    },
    [],
  );

  const closeEditor = useCallback(() => {
    setConfig(null);
    setInitialValue("");
  }, []);

  const handleSave = useCallback(
    (value: string) => {
      if (!config) return;

      if (config.scope === "fields") {
        onSaveField(config.key, value);
      } else if (config.scope === "org") {
        onSaveOrgField(config.key, value);
      } else if (config.scope === "member" && config.memberIndex !== undefined) {
        onSaveMemberField(
          config.memberIndex,
          config.memberKey || "name",
          value,
        );
      }
      setConfig(null);
      setInitialValue("");
    },
    [config, onSaveField, onSaveOrgField, onSaveMemberField],
  );

  return {
    config,
    initialValue,
    openEditor,
    closeEditor,
    handleSave,
    isOpen: !!config,
  };
}