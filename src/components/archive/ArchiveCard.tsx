import React from 'react';
import { assetCssUrl } from '../../utils/assetPath';

// 인화지 텍스처 주입 — ArchiveSurface와 동일 사유(CSS url()의 base path 문제 회피).
const paperTextureStyle = {
  '--archive-paper-image': assetCssUrl('assets/archive/photo-paper.jpg'),
} as React.CSSProperties;

// 주의: JSX는 유니언 prop에 초과 속성 검사를 하지 않으므로 interactive=false에서 button 전용 속성이 컴파일 타임에 막히지 않는다(런타임에선 무시됨).
type ArchiveCardProps = {
  children: React.ReactNode;
  className?: string;
  /** 떨어지는 등장 연출(reducedMotion 시 CSS 가드가 자동 생략) */
  dealt?: boolean;
  /** 인화지 기울기 각도(도). 카드마다 다르게 줘 손으로 놓은 느낌. */
  tilt?: number;
} & (
  | ({ interactive: true } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ interactive?: false } & React.HTMLAttributes<HTMLElement>)
);

// 인화지 카드. interactive=true면 카드 전체가 <button>(접근성 불변 조항).
const ArchiveCard: React.FC<ArchiveCardProps> = ({ children, className = '', dealt = false, tilt, ...rest }) => {
  const classes = `archive-card ${dealt ? 'is-dealt' : ''} ${className}`;
  // 호출자 style과 텍스처·tilt 변수를 병합한다(클로버링 방지).
  const callerStyle = (rest as { style?: React.CSSProperties }).style;
  const mergedStyle: React.CSSProperties = {
    ...paperTextureStyle,
    ...callerStyle,
    ...(tilt !== undefined ? ({ '--archive-tilt': `${tilt}deg` } as React.CSSProperties) : {}),
  };

  if ('interactive' in rest && rest.interactive) {
    const { interactive: _interactive, style: _style, ...buttonProps } = rest;
    return (
      <button type="button" {...(buttonProps as React.ButtonHTMLAttributes<HTMLButtonElement>)} className={classes} style={mergedStyle}>
        {children}
      </button>
    );
  }
  const { interactive: _interactive, style: _style, ...sectionProps } = rest as { interactive?: false } & React.HTMLAttributes<HTMLElement>;
  return (
    <section {...sectionProps} className={classes} style={mergedStyle}>
      {children}
    </section>
  );
};

export default ArchiveCard;
