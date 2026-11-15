type FooterProps = {
  children: string;
};

export default function Footer({ children }: FooterProps) {
  return (
    <footer className="site-footer">
      <span className="footer-pulse" aria-hidden="true" />
      <p>{children}</p>
    </footer>
  );
}
