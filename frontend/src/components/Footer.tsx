type FooterProps = {
  children: string;
};

export default function Footer({ children }: FooterProps) {
  return (
    <footer className="site-footer">
      <span className="footer-pulse" aria-hidden="true" />
      <p>{children}</p>
      <p className="site-footer__disclaimer">
        Earth Pulse is an independent NASA Space Apps Challenge project and is not an official NASA product.
      </p>
    </footer>
  );
}
