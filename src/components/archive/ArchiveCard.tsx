import React from 'react';

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
  const style = tilt !== undefined ? ({ '--archive-tilt': `${tilt}deg` } as React.CSSProperties) : undefined;

  if ('interactive' in rest && rest.interactive) {
    const { interactive: _interactive, ...buttonProps } = rest;
    return (
      <button type="button" {...(buttonProps as React.ButtonHTMLAttributes<HTMLButtonElement>)} className={classes} style={style}>
        {children}
      </button>
    );
  }
  const { interactive: _interactive, ...sectionProps } = rest as { interactive?: false } & React.HTMLAttributes<HTMLElement>;
  return (
    <section {...sectionProps} className={classes} style={style}>
      {children}
    </section>
  );
};

export default ArchiveCard;
