import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 0. Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', server: 'inventario-marina-orth-api', time: new Date().toISOString() });
});

// 0.1 GET /api/dashboard/kpis - Endpoint ultra-ligero para métricas y KPIs del Dashboard (< 100ms)
app.get('/api/dashboard/kpis', async (req, res) => {
  try {
    const [
      totalMaterialesRes,
      totalActivosRes,
      criticosConsumiblesRes,
      prestamosActivosRes,
      prestamosVencidosRes
    ] = await Promise.all([
      // Total consumibles
      pool.query('SELECT COUNT(*) FROM consumibles'),
      // Total activos
      pool.query('SELECT COUNT(*) FROM activos'),
      // Consumibles en stock crítico (disponible <= minimo o lte 5)
      pool.query('SELECT COUNT(*) FROM consumibles WHERE disponible <= COALESCE(minimo, 5)'),
      // Préstamos activos (estado = 'Activo' o 'activo')
      pool.query("SELECT COUNT(*) FROM prestamos WHERE LOWER(estado) = 'activo'"),
      // Préstamos vencidos (estado activo y fecha_devolucion_esperada < hoy)
      pool.query("SELECT COUNT(*) FROM prestamos WHERE LOWER(estado) = 'activo' AND fecha_devolucion_esperada < CURRENT_DATE")
    ]);

    const totalConsumibles = parseInt(totalMaterialesRes.rows[0]?.count || '0', 10);
    const totalActivos = parseInt(totalActivosRes.rows[0]?.count || '0', 10);
    const totalItems = totalConsumibles + totalActivos;
    const stockCritico = parseInt(criticosConsumiblesRes.rows[0]?.count || '0', 10);
    const prestamosActivos = parseInt(prestamosActivosRes.rows[0]?.count || '0', 10);
    const prestamosVencidos = parseInt(prestamosVencidosRes.rows[0]?.count || '0', 10);

    res.json({
      success: true,
      data: {
        totalItems,
        totalConsumibles,
        totalActivos,
        stockCritico,
        prestamosActivos,
        prestamosVencidos,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error al calcular KPIs del dashboard:', err);
    res.status(500).json({ success: false, error: 'Error al obtener KPIs del dashboard' });
  }
});

// 1. GET /api/activos - Lista todos los activos ordenados por placa
app.get('/api/activos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activos ORDER BY placa ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar activos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener activos' });
  }
});

// 2. GET /api/activos/:placa - Retorna un activo específico por su placa (para QR o detalle)
app.get('/api/activos/:placa', async (req, res) => {
  try {
    const { placa } = req.params;
    const result = await pool.query(
      'SELECT * FROM activos WHERE LOWER(placa) = LOWER($1)',
      [placa.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Activo con placa ${placa} no encontrado` });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener activo por placa:', err);
    res.status(500).json({ success: false, error: 'Error al buscar activo' });
  }
});

// 3. POST /api/activos - Registra un nuevo activo tecnológico
app.post('/api/activos', async (req, res) => {
  try {
    const {
      placa,
      nombre,
      marca,
      modelo,
      serial,
      sede = 'Medellín',
      ubicacion,
      ubicacion_estante = null,
      estado = 'Disponible',
      custodio = null,
      fecha_devolucion = null,
      en_contabilidad = false,
    } = req.body;

    if (!placa || !nombre) {
      return res.status(400).json({ success: false, message: 'La placa y el nombre son obligatorios.' });
    }

    const result = await pool.query(
      `INSERT INTO activos (placa, nombre, marca, modelo, serial, sede, estado, custodio, fecha_devolucion, ubicacion_estante, en_contabilidad)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        placa.trim(),
        nombre.trim(),
        marca || null,
        modelo || null,
        serial ? serial.trim() : null,
        sede,
        estado,
        custodio,
        fecha_devolucion,
        ubicacion_estante ? ubicacion_estante.trim() : null,
        Boolean(en_contabilidad),
      ]
    );

    res.status(201).json({ success: true, message: 'Activo registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar activo:', err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Ya existe un activo con esa placa o número serial.' });
    }
    res.status(500).json({ success: false, error: 'Error al guardar el activo' });
  }
});

// 3.1 PUT /api/activos/:placa - Actualiza un activo tecnológico
app.put('/api/activos/:placa', async (req, res) => {
  try {
    const { placa } = req.params;
    const {
      nombre,
      marca,
      modelo,
      serial,
      sede,
      ubicacion_estante,
      estado,
      custodio,
      fecha_devolucion,
      en_contabilidad,
    } = req.body;

    const result = await pool.query(
      `UPDATE activos
       SET nombre = COALESCE($1, nombre),
           marca = COALESCE($2, marca),
           modelo = COALESCE($3, modelo),
           serial = COALESCE($4, serial),
           sede = COALESCE($5, sede),
           ubicacion_estante = COALESCE($6, ubicacion_estante),
           estado = COALESCE($7, estado),
           custodio = COALESCE($8, custodio),
           fecha_devolucion = COALESCE($9, fecha_devolucion),
           en_contabilidad = CASE WHEN $10 IS NOT NULL THEN $10::boolean ELSE en_contabilidad END
       WHERE LOWER(placa) = LOWER($11)
       RETURNING *`,
      [
        nombre,
        marca,
        modelo,
        serial,
        sede,
        ubicacion_estante !== undefined ? ubicacion_estante : null,
        estado,
        custodio,
        fecha_devolucion,
        en_contabilidad !== undefined ? Boolean(en_contabilidad) : null,
        placa.trim()
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activo no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar activo:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar activo' });
  }
});

// 4. GET /api/consumibles - Lista los materiales con su stock disponible y mínimo
app.get('/api/consumibles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM consumibles ORDER BY material ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar consumibles:', err);
    res.status(500).json({ success: false, error: 'Error al obtener consumibles' });
  }
});

// 4.1 POST /api/consumibles - Registra un nuevo consumible / insumo
app.post('/api/consumibles', async (req, res) => {
  try {
    const {
      id,
      material,
      categoria = 'Robótica',
      disponible = 0,
      minimo = 5,
      ubicacion = 'Oficina FMO',
      ubicacion_estante = null
    } = req.body;

    if (!id || !material) {
      return res.status(400).json({ success: false, message: 'El id/código y el nombre del material son obligatorios.' });
    }

    const result = await pool.query(
      `INSERT INTO consumibles (id, material, categoria, disponible, minimo, ubicacion, ubicacion_estante)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id.trim(),
        material.trim(),
        categoria,
        Number(disponible) || 0,
        Number(minimo) || 5,
        ubicacion,
        ubicacion_estante ? ubicacion_estante.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Consumible registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar consumible:', err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Ya existe un consumible con ese código.' });
    }
    res.status(500).json({ success: false, error: 'Error al guardar el consumible' });
  }
});

// 4.2 PUT /api/consumibles/:id - Actualiza un consumible / insumo
app.put('/api/consumibles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      material,
      categoria,
      disponible,
      minimo,
      ubicacion,
      ubicacion_estante
    } = req.body;

    const result = await pool.query(
      `UPDATE consumibles
       SET material = COALESCE($1, material),
           categoria = COALESCE($2, categoria),
           disponible = COALESCE($3, disponible),
           minimo = COALESCE($4, minimo),
           ubicacion = COALESCE($5, ubicacion),
           ubicacion_estante = COALESCE($6, ubicacion_estante)
       WHERE LOWER(id) = LOWER($7)
       RETURNING *`,
      [
        material,
        categoria,
        disponible !== undefined ? Number(disponible) : null,
        minimo !== undefined ? Number(minimo) : null,
        ubicacion,
        ubicacion_estante !== undefined ? ubicacion_estante : null,
        id.trim()
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consumible no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar consumible:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar consumible' });
  }
});

// GET /api/prestamos - Lista historial de préstamos
app.get('/api/prestamos', async (req, res) => {
  try {
    const query = `
      SELECT p.*, a.nombre as nombre_activo, a.marca, a.modelo
      FROM prestamos p
      LEFT JOIN activos a ON LOWER(p.placa_activo) = LOWER(a.placa)
      ORDER BY p.id DESC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar préstamos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener préstamos' });
  }
});

// 5. POST /api/prestamos - Registra un préstamo en transacción (inserta préstamo + actualiza activo)
app.post('/api/prestamos', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      placa_activo,
      solicitante,
      sede = 'Medellín',
      motivo = '',
      fecha_salida,
      fecha_devolucion_esperada
    } = req.body;

    if (!placa_activo || !solicitante || !fecha_devolucion_esperada) {
      return res.status(400).json({
        success: false,
        message: 'placa_activo, solicitante y fecha_devolucion_esperada son requeridos.'
      });
    }

    await client.query('BEGIN');

    // Verificar si el activo existe
    const activoRes = await client.query(
      'SELECT * FROM activos WHERE LOWER(placa) = LOWER($1) FOR UPDATE',
      [placa_activo.trim()]
    );

    if (activoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: `El activo con placa ${placa_activo} no existe.` });
    }

    const activoActual = activoRes.rows[0];

    // Registrar préstamo
    const prestamoRes = await client.query(
      `INSERT INTO prestamos (placa_activo, solicitante, sede, motivo, fecha_salida, fecha_devolucion_esperada, estado)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, 'Activo')
       RETURNING *`,
      [
        activoActual.placa,
        solicitante.trim(),
        sede,
        motivo,
        fecha_salida || null,
        fecha_devolucion_esperada
      ]
    );

    // Actualizar activo: estado = 'En campo', custodio = solicitante, fecha_devolucion = fecha_esperada
    await client.query(
      `UPDATE activos
       SET estado = 'En campo',
           custodio = $1,
           fecha_devolucion = $2
       WHERE placa = $3`,
      [solicitante.trim(), fecha_devolucion_esperada, activoActual.placa]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Préstamo registrado exitosamente y activo actualizado',
      data: prestamoRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar préstamo:', err);
    res.status(500).json({ success: false, error: 'Error al registrar préstamo en base de datos' });
  } finally {
    client.release();
  }
});

// 6. PUT /api/prestamos/:id/devolver - Marca préstamo como 'Devuelto' y restaura activo
app.put('/api/prestamos/:id/devolver', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Buscar préstamo
    const prestamoRes = await client.query(
      'SELECT * FROM prestamos WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (prestamoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Préstamo no encontrado' });
    }

    const prestamo = prestamoRes.rows[0];

    // Marcar como devuelto
    const updatedPrestamoRes = await client.query(
      `UPDATE prestamos
       SET estado = 'Devuelto',
           fecha_devolucion_real = CURRENT_DATE
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Revertir estado del activo
    await client.query(
      `UPDATE activos
       SET estado = 'Disponible',
           custodio = NULL,
           fecha_devolucion = NULL
       WHERE LOWER(placa) = LOWER($1)`,
      [prestamo.placa_activo]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Préstamo marcado como devuelto y activo disponible nuevamente',
      data: updatedPrestamoRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al devolver préstamo:', err);
    res.status(500).json({ success: false, error: 'Error al procesar la devolución' });
  } finally {
    client.release();
  }
});

// 6.1 PUT /api/prestamos/:id - Actualiza fecha pactada y observaciones del préstamo
app.put('/api/prestamos/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { fecha_devolucion_esperada, observaciones, motivo } = req.body;

    await client.query('BEGIN');

    const prestamoRes = await client.query('SELECT * FROM prestamos WHERE id = $1 FOR UPDATE', [id]);
    if (prestamoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Préstamo no encontrado' });
    }

    const nuevoMotivo = observaciones !== undefined ? observaciones : (motivo !== undefined ? motivo : prestamoRes.rows[0].motivo);
    const nuevaFecha = fecha_devolucion_esperada || prestamoRes.rows[0].fecha_devolucion_esperada;

    const updatedRes = await client.query(
      `UPDATE prestamos
       SET fecha_devolucion_esperada = $1,
           motivo = $2
       WHERE id = $3
       RETURNING *`,
      [nuevaFecha, nuevoMotivo, id]
    );

    // Actualizar fecha_devolucion en activos si aplica
    if (prestamoRes.rows[0].placa_activo && nuevaFecha) {
      await client.query(
        `UPDATE activos
         SET fecha_devolucion = $1
         WHERE LOWER(placa) = LOWER($2)`,
        [nuevaFecha, prestamoRes.rows[0].placa_activo]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Préstamo actualizado exitosamente', data: updatedRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar préstamo:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar préstamo en base de datos' });
  } finally {
    client.release();
  }
});

// 7. GET /api/consumibles/remisiones - Lista las remisiones agrupadas de consumibles
app.get('/api/consumibles/remisiones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM remisiones_consumibles ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar remisiones:', err);
    res.status(500).json({ success: false, error: 'Error al obtener remisiones de consumibles' });
  }
});

// 8. POST /api/consumibles/remisiones - Crea una remisión agrupada y descuenta el stock de cada material
app.post('/api/consumibles/remisiones', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      responsable_recibe,
      sede = 'Medellín',
      proyecto = '',
      motivo = '',
      items = [],
    } = req.body;

    if (!responsable_recibe) {
      return res.status(400).json({ success: false, message: 'responsable_recibe es obligatorio.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe incluir al menos un ítem en la remisión.' });
    }

    await client.query('BEGIN');

    // Generar consecutivo tipo REM-2026-0001
    const year = new Date().getFullYear();
    const countRes = await client.query('SELECT COUNT(*) FROM remisiones_consumibles');
    const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
    const remision_id = `REM-${year}-${String(nextSeq).padStart(4, '0')}`;
    const codigo_acta = remision_id;

    let total_unidades = 0;
    const itemsProcesados = [];

    for (const item of items) {
      const matId = item.material_id || item.id;
      const cant = Number(item.cantidad || item.cantidadEntrega) || 1;
      const matNombre = item.material || item.material_nombre || item.nombre || `Consumible (${matId})`;

      // Descontar stock en la tabla consumibles
      const updateRes = await client.query(
        `UPDATE consumibles
         SET disponible = GREATEST(0, disponible - $1)
         WHERE LOWER(id) = LOWER($2)
         RETURNING *`,
        [cant, matId]
      );

      // Registrar también en entregas individuales para compatibilidad
      await client.query(
        `INSERT INTO entregas_consumibles (remision_id, material_id, material_nombre, cantidad, responsable, sede, proyecto_motivo, tipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Consumido')`,
        [remision_id, matId, matNombre, cant, responsable_recibe.trim(), sede, motivo || proyecto]
      );

      total_unidades += cant;
      itemsProcesados.push({
        material_id: matId,
        nombre: matNombre,
        cantidad: cant,
        stock_restante: updateRes.rows[0]?.disponible ?? null,
      });
    }

    // Insertar el contenedor de remisión
    const remisionRes = await client.query(
      `INSERT INTO remisiones_consumibles 
       (remision_id, codigo_acta, fecha_entrega, responsable_recibe, sede, proyecto, motivo, items, total_items, total_unidades)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7::jsonb, $8, $9)
       RETURNING *`,
      [
        remision_id,
        codigo_acta,
        responsable_recibe.trim(),
        sede,
        proyecto,
        motivo,
        JSON.stringify(itemsProcesados),
        itemsProcesados.length,
        total_unidades,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Remisión ${remision_id} registrada con éxito`,
      data: remisionRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar remisión de consumibles:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al guardar remisión' });
  } finally {
    client.release();
  }
});

// 9. GET /api/consumibles/entregas - Lista entregas individuales o remisiones para compatibilidad
app.get('/api/consumibles/entregas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entregas_consumibles ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar entregas individuales:', err);
    res.status(500).json({ success: false, error: 'Error al obtener entregas de consumibles' });
  }
});

// 10. POST /api/consumibles/entregas - Endpoint simple de entrega
app.post('/api/consumibles/entregas', async (req, res) => {
  try {
    const { material_id, material_nombre, cantidad = 1, responsable, sede = 'Medellín', proyecto_motivo = '' } = req.body;
    const result = await pool.query(
      `INSERT INTO entregas_consumibles (material_id, material_nombre, cantidad, responsable, sede, proyecto_motivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [material_id, material_nombre, Number(cantidad), responsable, sede, proyecto_motivo]
    );
    // Descontar en consumibles
    await pool.query(
      'UPDATE consumibles SET disponible = GREATEST(0, disponible - $1) WHERE LOWER(id) = LOWER($2)',
      [Number(cantidad), material_id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear entrega individual:', err);
    res.status(500).json({ success: false, error: 'Error al registrar entrega' });
  }
});

// 11. GET /api/solicitudes - Lista solicitudes de inventario con sus ítems entrelazados
app.get('/api/solicitudes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             s.tipo_solicitud AS tipo,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', i.id,
                   'solicitud_id', i.solicitud_id,
                   'tipo_item', i.tipo_item,
                   'item_id', i.item_id,
                   'nombre_item', i.nombre_item,
                   'cantidad', i.cantidad,
                   'nombre_sugerido', i.nombre_sugerido,
                   'categoria_sugerida', i.categoria_sugerida,
                   'url_compra', i.url_compra,
                   'precio_estimado', i.precio_estimado,
                   'ingresado_inventario', i.ingresado_inventario
                 )
               ) FILTER (WHERE i.id IS NOT NULL), 
               '[]'::json
             ) AS items,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', i.id,
                   'solicitud_id', i.solicitud_id,
                   'tipo_item', i.tipo_item,
                   'item_id', i.item_id,
                   'nombre_item', i.nombre_item,
                   'cantidad', i.cantidad,
                   'nombre_sugerido', i.nombre_sugerido,
                   'categoria_sugerida', i.categoria_sugerida,
                   'url_compra', i.url_compra,
                   'precio_estimado', i.precio_estimado,
                   'ingresado_inventario', i.ingresado_inventario
                 )
               ) FILTER (WHERE i.id IS NOT NULL), 
               '[]'::json
             ) AS items_solicitud
      FROM solicitudes_inventario s
      LEFT JOIN items_solicitud i ON s.id = i.solicitud_id
      GROUP BY s.id
      ORDER BY s.creado_en DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar solicitudes:', err);
    res.status(500).json({ success: false, error: 'Error al obtener solicitudes' });
  }
});

// 12. POST /api/solicitudes - Registra una nueva solicitud con sus ítems
app.post('/api/solicitudes', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      usuario_id,
      usuario_nombre = 'Docente / Custodio',
      sede = 'Medellín',
      proyecto_steam_id = null,
      motivo = '',
      justificacion = '',
      fecha_devolucion_estimada = null,
      fecha_devolucion = null,
      estado = 'PENDIENTE',
      observaciones_admin = null,
    } = req.body;

    const rawItems = req.body.items || req.body.items_solicitud || [];
    const items = Array.isArray(rawItems) ? rawItems : [];

    const rawTipoReq = String(req.body.tipo_solicitud || req.body.tipo || req.body.tipoSolicitud || '').toUpperCase().trim();
    const esCompraReq =
      rawTipoReq === 'SUGERENCIA_COMPRA' ||
      rawTipoReq === 'COMPRA' ||
      rawTipoReq.includes('COMPRA') ||
      items.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido || String(i.tipo_item || '').toLowerCase() === 'compra') ||
      (String(motivo || justificacion || '').toLowerCase().includes('compra'));
    const esConsumibleReq = !esCompraReq && rawTipoReq.includes('CONSUMIB');
    const tipoSolicitudFinal = esCompraReq
      ? 'SUGERENCIA_COMPRA'
      : (esConsumibleReq ? 'CONSUMIBLES' : 'PRESTAMO_EQUIPO');

    const fechaDev = fecha_devolucion_estimada || fecha_devolucion || null;
    const motivoFinal = motivo || justificacion || 'Sin motivo especificado';

    const solRes = await client.query(
      `INSERT INTO solicitudes_inventario (
        usuario_id, usuario_nombre, sede, tipo_solicitud,
        proyecto_steam_id, motivo, justificacion,
        fecha_devolucion_estimada, estado, observaciones_admin
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        usuario_id || null,
        usuario_nombre,
        sede,
        tipoSolicitudFinal,
        proyecto_steam_id,
        motivoFinal,
        justificacion || motivoFinal,
        fechaDev,
        estado,
        observaciones_admin,
      ]
    );

    const nuevaSolicitud = solRes.rows[0];
    const itemsCreados = [];

    if (items.length > 0) {
      for (const it of items) {
        const nomSugerido = it.nombre_sugerido || (esCompraReq ? (it.nombre_item || it.nombre || 'Artículo sugerido') : null);
        const catSugerida = it.categoria_sugerida || (esCompraReq ? 'consumibles' : null);
        const urlComp = it.url_compra || it.url || it.link_compra || null;
        const precioEst = Number(it.precio_estimado) || Number(it.precio) || 0;
        const tipoItemFinal = esCompraReq
          ? 'compra'
          : (it.tipo_item || (esConsumibleReq ? 'consumible' : 'equipo'));

        const itemRes = await client.query(
          `INSERT INTO items_solicitud (
            solicitud_id, tipo_item, item_id, nombre_item, cantidad,
            nombre_sugerido, categoria_sugerida, url_compra, precio_estimado,
            ingresado_inventario
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            nuevaSolicitud.id,
            tipoItemFinal,
            it.item_id || null,
            it.nombre_item || nomSugerido || 'Artículo',
            parseInt(it.cantidad, 10) || 1,
            nomSugerido,
            catSugerida,
            urlComp,
            precioEst,
            Boolean(it.ingresado_inventario),
          ]
        );
        itemsCreados.push(itemRes.rows[0]);
      }
    }

    await client.query('COMMIT');
    nuevaSolicitud.items = itemsCreados;
    nuevaSolicitud.items_solicitud = itemsCreados;
    nuevaSolicitud.tipo_solicitud = tipoSolicitudFinal;
    nuevaSolicitud.tipo = tipoSolicitudFinal;
    res.status(201).json({ success: true, data: nuevaSolicitud });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar solicitud:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al radicar solicitud' });
  } finally {
    client.release();
  }
});

// 13. PATCH /api/solicitudes/:id - Actualiza estado u observaciones de una solicitud
app.patch('/api/solicitudes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones_admin, motivo, sede, fecha_devolucion_estimada, proyecto_steam_id } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (estado !== undefined) {
      updates.push(`estado = $${idx++}`);
      values.push(estado);
    }
    if (observaciones_admin !== undefined) {
      updates.push(`observaciones_admin = $${idx++}`);
      values.push(observaciones_admin);
    }
    if (motivo !== undefined) {
      updates.push(`motivo = $${idx++}`);
      values.push(motivo);
    }
    if (sede !== undefined) {
      updates.push(`sede = $${idx++}`);
      values.push(sede);
    }
    if (fecha_devolucion_estimada !== undefined) {
      updates.push(`fecha_devolucion_estimada = $${idx++}`);
      values.push(fecha_devolucion_estimada);
    }
    if (proyecto_steam_id !== undefined) {
      updates.push(`proyecto_steam_id = $${idx++}`);
      values.push(proyecto_steam_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE solicitudes_inventario
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar solicitud:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar solicitud' });
  }
});

// 14. POST /api/solicitudes/ingreso-inventario - Ingreso directo al inventario físico de una sugerencia de compra
app.post('/api/solicitudes/ingreso-inventario', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      solicitud_id,
      item_solicitud_id,
      tabla_destino = 'consumibles', // 'consumibles' | 'papeleria'
      sku,
      nombre,
      cantidad = 1,
      sede = 'Medellín',
      stock_minimo = 5,
      ubicacion_estante = 'Recepción',
    } = req.body;

    if (!sku || !nombre) {
      throw new Error('El SKU y el nombre del artículo son obligatorios');
    }

    let itemInsertado = null;
    const cantNum = parseInt(cantidad, 10) || 1;
    const minNum = parseInt(stock_minimo, 10) || 5;

    if (tabla_destino === 'consumibles') {
      const insRes = await client.query(
        `INSERT INTO consumibles (
          id, material, categoria, disponible, minimo, ubicacion, ubicacion_estante,
          estado, condicion, observaciones, area, tipo_inventario
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          sku,
          nombre,
          'Robótica y Consumibles',
          cantNum,
          minNum,
          sede,
          ubicacion_estante,
          'Disponible',
          'Nuevo',
          `Ingreso automático desde Sugerencia de Compra #${solicitud_id || 'N/A'}`,
          'Tecnología y STEAM',
          'consumible',
        ]
      );
      itemInsertado = insRes.rows[0];
    } else {
      const insRes = await client.query(
        `INSERT INTO papeleria (
          id, material, descripcion, disponible, minimo, sede, ubicacion_estante,
          condicion, estado, observaciones, responsable
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          sku,
          nombre,
          `Material ingresado desde sugerencia de compra #${solicitud_id || 'N/A'}`,
          cantNum,
          minNum,
          sede,
          ubicacion_estante,
          'Nuevo',
          'Disponible',
          `Ingreso automático desde Sugerencia de Compra #${solicitud_id || 'N/A'}`,
          'Bodega Central',
        ]
      );
      itemInsertado = insRes.rows[0];
    }

    // Actualizar ítem en items_solicitud
    if (item_solicitud_id) {
      await client.query(
        `UPDATE items_solicitud
         SET ingresado_inventario = true, item_id = $1
         WHERE id = $2`,
        [sku, item_solicitud_id]
      );
    }

    // Verificar si todos los ítems de esta solicitud ya fueron ingresados
    let solicitudCompletada = false;
    if (solicitud_id) {
      const checkItems = await client.query(
        `SELECT COUNT(*) as pendientes
         FROM items_solicitud
         WHERE solicitud_id = $1 AND ingresado_inventario = false`,
        [solicitud_id]
      );
      const pendientes = parseInt(checkItems.rows[0]?.pendientes || '0', 10);
      if (pendientes === 0) {
        await client.query(
          `UPDATE solicitudes_inventario
           SET estado = 'Completada / En Inventario'
           WHERE id = $1`,
          [solicitud_id]
        );
        solicitudCompletada = true;
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      item: itemInsertado,
      solicitud_completada: solicitudCompletada,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al ingresar artículo a inventario:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al ingresar artículo al inventario' });
  } finally {
    client.release();
  }
});

// Iniciar servidor tras verificar DB
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor backend corriendo exitosamente en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Falló la inicialización del servidor debido a la base de datos:', err);
    process.exit(1);
  }
}

startServer();

export default app;
