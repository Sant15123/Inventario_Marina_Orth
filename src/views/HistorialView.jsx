
import { fmtDate, isOverdue } from '../data/initialData';

export default function HistorialView({ movements }) {
  const typeLabel = {
    ingreso: 'Ingreso',
    prestamo: 'Préstamo',
    entrega: 'Entrega',
    baja: 'Baja'
  };

  const typePillClass = {
    ingreso: 'ok',
    prestamo: 'prestado',
    entrega: 'default',
    baja: 'low'
  };

  return (
    <div>
      <section>
        <h2>
          <span>Historial Completo de Movimientos</span>
          <span className="pill default">{movements.length} transacciones</span>
        </h2>

        <div className="panel table-responsive">
          {movements.length === 0 ? (
            <div className="empty">Aún no hay movimientos registrados.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Elemento</th>
                  <th>Unidad(es) / Cantidad</th>
                  <th>Persona / Origen</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  let statusText = 'Cerrado';
                  let statusClass = 'default';

                  if (m.status === 'activo') {
                    if (isOverdue(m)) {
                      statusText = 'Vencido';
                      statusClass = 'vencido';
                    } else {
                      statusText = 'Activo';
                      statusClass = 'prestado';
                    }
                  } else if (m.type === 'prestamo' && m.returnedDate) {
                    statusText = `Devuelto (${fmtDate(m.returnedDate)})`;
                    statusClass = 'ok';
                  }

                  const unitsOrQty = (m.unitCodes && m.unitCodes.length) ? m.unitCodes.join(', ') : m.qty;

                  return (
                    <tr key={m.id}>
                      <td className="mono-num">{fmtDate(m.date)}</td>
                      <td>
                        <span className={`pill ${typePillClass[m.type] || 'default'}`}>
                          {typeLabel[m.type] || m.type}
                        </span>
                      </td>
                      <td><strong>{m.itemName}</strong></td>
                      <td className="wrap">{unitsOrQty}</td>
                      <td>{m.person || '—'}</td>
                      <td className="wrap">{m.motive || '—'}</td>
                      <td>
                        <span className={`pill ${statusClass}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}


