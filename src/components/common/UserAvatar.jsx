import React, { useState } from 'react';

export const UserAvatar = ({
  nombre = 'Usuario',
  avatarUrl = null,
  size = 'w-8 h-8',
  textSize = 'text-xs',
  className = ''
}) => {
  const [errorCarga, setErrorCarga] = useState(false);
  const inicial = (nombre || 'U').trim().charAt(0).toUpperCase();

  // Si tiene URL y no ha fallado la carga, renderizar la imagen
  if (avatarUrl && !errorCarga) {
    return (
      <img
        src={avatarUrl}
        alt={`Avatar de ${nombre}`}
        className={`${size} rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 ${className}`}
        onError={() => setErrorCarga(true)}
      />
    );
  }

  // Fallback nativo: Círculo verde institucional con inicial blanca (idéntico al actual)
  return (
    <div
      className={`${size} rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center ${textSize} shadow-sm shrink-0 select-none ${className}`}
    >
      {inicial}
    </div>
  );
};

export default UserAvatar;
