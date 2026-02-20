import {useState, useRef, useEffect, useCallback} from 'react'
import './index.css'

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

function CustomSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  label,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState(-1)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const isMobile = useIsMobile()

  const selected = options.find(o => String(o.value) === String(value))

  const close = useCallback(() => {
    setOpen(false)
    setFocusIdx(-1)
  }, [])

  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [close])

  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open, isMobile])

  useEffect(() => {
    if (open && listRef.current && focusIdx >= 0) {
      const item = listRef.current.children[focusIdx]
      if (item) item.scrollIntoView({block: 'nearest'})
    }
  }, [focusIdx, open])

  const handleToggle = () => {
    if (!open) {
      const idx = options.findIndex(o => String(o.value) === String(value))
      setFocusIdx(idx >= 0 ? idx : 0)
    }
    setOpen(prev => !prev)
  }

  const handleSelect = opt => {
    onChange(opt.value)
    close()
  }

  const handleKeyDown = e => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        handleToggle()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusIdx(prev => Math.min(prev + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIdx(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusIdx >= 0 && focusIdx < options.length) {
          handleSelect(options[focusIdx])
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Home':
        e.preventDefault()
        setFocusIdx(0)
        break
      case 'End':
        e.preventDefault()
        setFocusIdx(options.length - 1)
        break
      default:
        break
    }
  }

  const optionsList = (
    <ul
      className="custom-select__dropdown"
      ref={listRef}
      role="listbox"
      aria-label={label || placeholder}
    >
      {options.map((opt, i) => (
        <li
          key={opt.value}
          role="option"
          aria-selected={String(opt.value) === String(value)}
          className={`custom-select__option ${
            String(opt.value) === String(value)
              ? 'custom-select__option--selected'
              : ''
          } ${i === focusIdx ? 'custom-select__option--focused' : ''}`}
          onClick={() => handleSelect(opt)}
          onMouseEnter={() => setFocusIdx(i)}
        >
          <span className="custom-select__option-text">{opt.label}</span>
          {String(opt.value) === String(value) && (
            <span className="custom-select__check">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3.5 7L6 9.5L10.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <div
      className={`custom-select ${className} ${
        open ? 'custom-select--open' : ''
      }`}
      ref={containerRef}
    >
      {label && (
        <label className="custom-select__label" htmlFor={id}>
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        className="custom-select__trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label || placeholder}
      >
        <span className="custom-select__value">
          {selected ? selected.label : placeholder}
        </span>
        <span
          className={`custom-select__arrow ${
            open ? 'custom-select__arrow--up' : ''
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && isMobile && (
        <div className="custom-select__overlay" onClick={close}>
          <div
            className="custom-select__sheet"
            onClick={e => e.stopPropagation()}
          >
            <div className="custom-select__sheet-handle" />
            <div className="custom-select__sheet-header">
              <span className="custom-select__sheet-title">
                {label || placeholder}
              </span>
              <button
                type="button"
                className="custom-select__sheet-close"
                onClick={close}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 5L15 15M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {optionsList}
          </div>
        </div>
      )}

      {open && !isMobile && optionsList}
    </div>
  )
}

export default CustomSelect
