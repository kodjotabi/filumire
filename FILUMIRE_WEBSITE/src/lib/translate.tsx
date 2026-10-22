import { localizedAsset } from "./localized-assets";
import { cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";
import { FRENCH } from "./translations";
import { localizeHref, type Locale } from "./locale";
export function text(value: string, locale: Locale): string {
 if (locale === "en") return value;
 const key = value.replace(/\s+/g," ").trim();
 const translated = FRENCH[key];
 return translated === undefined ? value : (value.match(/^\s*/)?.[0] || "") + translated + (value.match(/\s*$/)?.[0] || "");
}
/** Translate the same retained element tree, including text fragments, attributes and links. */
export function translateTree(node: ReactNode, locale: Locale): ReactNode {
 if (typeof node === "string") return text(node, locale);
 if (Array.isArray(node)) return node.map(child => translateTree(child, locale));
 if (!isValidElement(node)) return node;
 const element = node as ReactElement<Record<string, unknown>>;
 const props = { ...element.props };
 if(typeof props.src === "string") props.src = localizedAsset(props.src, locale);
 if (!props["data-language-switch"] && typeof props.href === "string") props.href = localizeHref(props.href, locale);
 for (const key of ["alt","title","aria-label","placeholder"]) if(typeof props[key] === "string") props[key] = text(props[key] as string, locale);
 if (typeof element.type !== "string" && ("initialCategory" in props || "locale" in props || ["learner","parent","teacher"].includes(String(props.role)))) props.locale = locale;
 if (props.className === "step-name-fr") props.lang = "fr";
 if (props.className === "step-name-en" && locale === "fr") props.children = translateTree(props.children as ReactNode, locale);
 else props.children = translateTree(props.children as ReactNode, locale);
 if (element.type === "h4") return cloneElement({ ...element, type: "h3" }, props);
 return cloneElement(element, props);
}
