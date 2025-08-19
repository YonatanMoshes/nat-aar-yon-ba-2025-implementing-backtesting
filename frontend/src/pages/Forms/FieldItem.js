export function StandAloneField({ label, type, id, placeholder, value, onChange }) {
    return (
        <div className="col-mb-12">
            <label htmlFor={id} className="form-label">{label}</label>
            <input type={type} className="form-control form-box" id={id} value={value} placeholder={placeholder} onChange={onChange} required></input>
        </div>
    );
}

export function SideBySideField({ label, type, id, placeholder, value, onChange }) {
    return (
        <div className="col-md-6">
            <label htmlFor={id} className="form-label">{label}</label>
            <input type={type} className="form-control form-small-box" id={id} value={value} placeholder={placeholder} onChange={onChange} required></input>
        </div>
    );
}

export default StandAloneField