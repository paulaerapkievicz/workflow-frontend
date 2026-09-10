import s from "@/styles/contract.module.scss";

interface Props {
  /** HTML já sanitizado e preenchido pelo backend (contractDocument.sanitizeContractHtml). */
  html: string;
  scroll?: boolean;
}

export default function ContractDocument({ html, scroll = true }: Props) {
  const paper = <div className={s.paper} dangerouslySetInnerHTML={{ __html: html }} />;
  return scroll ? <div className={s.scroll}>{paper}</div> : paper;
}
