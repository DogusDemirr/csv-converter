import type { ComponentProps } from 'react';
export function TextPanel({label,note,...props}:ComponentProps<'textarea'> & {id:string;label:string;note?:string}) {
 return <div><div className="editor-heading"><label htmlFor={props.id}>{label}</label>{note && <span>{note}</span>}</div><textarea spellCheck={false} {...props}/></div>;
}
