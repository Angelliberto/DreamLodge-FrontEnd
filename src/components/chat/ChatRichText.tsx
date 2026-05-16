import React, { useMemo } from 'react';
import { Linking, Text, type TextProps } from 'react-native';

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; label: string; url: string };

/** Divide el texto en trozos de texto plano y enlaces Markdown [label](https://...). */
function parseMarkdownLinks(content: string): Segment[] {
  const s = String(content ?? '');
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      out.push({ kind: 'text', text: s.slice(last, m.index) });
    }
    out.push({ kind: 'link', label: m[1], url: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push({ kind: 'text', text: s.slice(last) });
  }
  return out.length ? out : [{ kind: 'text', text: s }];
}

const linkStyle = { color: '#7dd3fc', textDecorationLine: 'underline' as const };

type Props = {
  children: string;
  className?: string;
  style?: TextProps['style'];
};

export function ChatRichText({ children, className, style }: Props) {
  const segments = useMemo(() => parseMarkdownLinks(children), [children]);

  const openUrl = (url: string) => {
    if (!/^https?:\/\//i.test(url)) return;
    void Linking.openURL(url);
  };

  if (segments.length === 1 && segments[0].kind === 'text') {
    return (
      <Text className={className} style={style} selectable>
        {segments[0].text}
      </Text>
    );
  }

  return (
    <Text className={className} style={style} selectable>
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <Text key={i} selectable>
            {seg.text}
          </Text>
        ) : (
          <Text
            key={i}
            selectable
            style={linkStyle}
            onPress={() => openUrl(seg.url)}
            accessibilityRole="link"
          >
            {seg.label}
          </Text>
        )
      )}
    </Text>
  );
}
