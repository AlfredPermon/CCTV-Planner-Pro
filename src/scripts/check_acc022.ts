
import { db } from '@/lib/db'

async function check() {
  const comp = await db.cat_componentes.findUnique({ where: { codigo_componente: 'ACC_022' } })
  console.log('Componente:', comp)
  const price = await db.cotizaciones_historico.findFirst({ where: { codigo_componente: 'ACC_022', vigente: true } })
  console.log('Precio Vigente:', price)
}

check().catch(console.error)
