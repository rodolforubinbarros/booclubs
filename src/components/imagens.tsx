const IMAGEM_USUARIO_PADRAO = "/imagens/usuario_padrao.png";
const IMAGEM_CLUBE_PADRAO = "/imagens/clube_padrao.png";

export function ImagemUsuario({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src ?? IMAGEM_USUARIO_PADRAO} alt={alt} className={className} />
  );
}

export function ImagemClube({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src ?? IMAGEM_CLUBE_PADRAO} alt={alt} className={className} />
  );
}