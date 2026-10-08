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
      estado = 'Disponible',
      custodio = null,
      fecha_devolucion = null
    } = req.body;

    if (!placa || !nombre) {
      return res.status(400).json({ success: false, message: 'La placa y el nombre son obligatorios.' });
    }

    const result = await pool.query(
      `INSERT INTO activos (placa, nombre, marca, modelo, serial, sede, estado, custodio, fecha_devolucion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        fecha_devolucion
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
