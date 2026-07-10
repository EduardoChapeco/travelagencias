/**
 * Transitional compatibility barrel.
 *
 * New code must import each control from its canonical module. This file keeps
 * historical imports working while the repository migration is completed.
 */
export { Field } from "./field";
export { FormInput as Input } from "./input";
export { NativeSelect as Select } from "./select";
export { FormTextarea as Textarea } from "./textarea";
export { SimpleSheet as Sheet } from "./sheet";
export { GhostButton, PrimaryButton } from "./button";
export { StatusBadge } from "./badge";
export { fmtDate, money } from "@/lib/formatters";
