/** The Kinset wordmark. */
export function Brand() {
  return (
    <span className="brand">
      <img
        className="brand-wordmark"
        src={`${import.meta.env.BASE_URL}kinset-wordmark.svg`}
        alt="Kinset"
        width="980"
        height="270"
      />
    </span>
  );
}

export default Brand;
