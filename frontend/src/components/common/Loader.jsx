const Loader = ({ message = 'Loading...' }) => {
  return (
    <div className="loader-wrapper">
      <div className="loader-spinner" />
      <p>{message}</p>
    </div>
  );
};

export default Loader;
