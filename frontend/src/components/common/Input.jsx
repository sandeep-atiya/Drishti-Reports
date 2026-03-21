const Input = ({ label, name, type = 'text', value, onChange, placeholder = '', className = '' }) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
};

export default Input;
