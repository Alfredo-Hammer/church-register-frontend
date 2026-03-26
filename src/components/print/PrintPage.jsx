export default function PrintPage({ children }) {
  return (
    <div
      id="print-page"
      className="bg-white w-full max-w-2xl rounded-lg shadow-xl"
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '27cm',
      }}
    >
      {children}
    </div>
  );
}
