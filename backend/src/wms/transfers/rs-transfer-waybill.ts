import { escapeXml, tbilisiDateTime } from '../../rs/waybills/rs-client.js';
import { ProductUnit } from '../products/product-unit.enum.js';
import { RS_UNITS } from '../stock/rs-matching.js';

export const RS_INTERNAL_TYPE = 1;
/** RS transport type "ავტოტრანსპორტი" (road); the only one offered for now. */
const RS_ROAD_TRANSPORT = 1;

export interface InternalWaybillGoods {
  name: string;
  barcode: string;
  unit: ProductUnit;
  quantity: number;
  price: number;
}

export interface InternalWaybillInput {
  sellerUnId: number;
  serviceUserId: number;
  startAddress: string;
  endAddress: string;
  driverId: string;
  driverName: string;
  carNumber: string;
  beginAt: Date;
  comment: string | null;
  goods: InternalWaybillGoods[];
}

const rsUnitId = (unit: ProductUnit) => Number(Object.entries(RS_UNITS).find(([, u]) => u === unit)![0]);
const money = (value: number) => Math.round(value * 100) / 100;
const decimal = (value: number) => String(Math.round(value * 10_000) / 10_000);

/** The XML RS's `save_waybill` expects for an internal transfer (შიდა გადაზიდვა): the seller is also the buyer. */
export function internalWaybillXml(input: InternalWaybillInput): string {
  const goods = input.goods
    .map((line) =>
      [
        '<GOODS>',
        '<ID>0</ID>',
        `<W_NAME>${escapeXml(line.name)}</W_NAME>`,
        `<UNIT_ID>${rsUnitId(line.unit)}</UNIT_ID>`,
        `<QUANTITY>${decimal(line.quantity)}</QUANTITY>`,
        `<PRICE>${decimal(line.price)}</PRICE>`,
        '<STATUS>1</STATUS>',
        `<AMOUNT>${decimal(money(line.price * line.quantity))}</AMOUNT>`,
        `<BAR_CODE>${escapeXml(line.barcode)}</BAR_CODE>`,
        '<A_ID>0</A_ID>',
        '<VAT_TYPE>0</VAT_TYPE>',
        `<QUANTITY_EXT>${decimal(line.quantity)}</QUANTITY_EXT>`,
        '</GOODS>',
      ].join(''),
    )
    .join('');
  const total = money(input.goods.reduce((sum, line) => sum + line.price * line.quantity, 0));
  return [
    '<WAYBILL>',
    '<SUB_WAYBILLS></SUB_WAYBILLS>',
    `<GOODS_LIST>${goods}</GOODS_LIST>`,
    '<WOOD_DOCS_LIST></WOOD_DOCS_LIST>',
    '<ID>0</ID>',
    `<TYPE>${RS_INTERNAL_TYPE}</TYPE>`,
    '<BUYER_TIN></BUYER_TIN>',
    '<CHEK_BUYER_TIN>0</CHEK_BUYER_TIN>',
    '<BUYER_NAME></BUYER_NAME>',
    `<START_ADDRESS>${escapeXml(input.startAddress)}</START_ADDRESS>`,
    `<END_ADDRESS>${escapeXml(input.endAddress)}</END_ADDRESS>`,
    `<DRIVER_TIN>${escapeXml(input.driverId)}</DRIVER_TIN>`,
    '<CHEK_DRIVER_TIN>1</CHEK_DRIVER_TIN>',
    `<DRIVER_NAME>${escapeXml(input.driverName)}</DRIVER_NAME>`,
    '<TRANSPORT_COAST>0</TRANSPORT_COAST>',
    '<RECEPTION_INFO></RECEPTION_INFO>',
    '<RECEIVER_INFO></RECEIVER_INFO>',
    '<DELIVERY_DATE></DELIVERY_DATE>',
    '<STATUS>0</STATUS>',
    `<SELER_UN_ID>${input.sellerUnId}</SELER_UN_ID>`,
    '<PAR_ID></PAR_ID>',
    `<FULL_AMOUNT>${decimal(total)}</FULL_AMOUNT>`,
    `<CAR_NUMBER>${escapeXml(input.carNumber)}</CAR_NUMBER>`,
    '<WAYBILL_NUMBER></WAYBILL_NUMBER>',
    `<S_USER_ID>${input.serviceUserId}</S_USER_ID>`,
    `<BEGIN_DATE>${tbilisiDateTime(input.beginAt)}</BEGIN_DATE>`,
    '<TRAN_COST_PAYER>2</TRAN_COST_PAYER>',
    `<TRANS_ID>${RS_ROAD_TRANSPORT}</TRANS_ID>`,
    '<TRANS_TXT></TRANS_TXT>',
    `<COMMENT>${escapeXml(input.comment ?? '')}</COMMENT>`,
    '<CATEGORY>0</CATEGORY>',
    '<IS_MED>0</IS_MED>',
    '<WOOD_LABELS></WOOD_LABELS>',
    '</WAYBILL>',
  ].join('');
}
