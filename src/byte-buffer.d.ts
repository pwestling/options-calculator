declare module "byte-buffer" {
  export default class ByteBuffer {

    static LITTLE_ENDIAN : any
    static BIG_ENDIAN : any

    constructor(): ByteBuffer;
    constructor(data : UInt8Array): ByteBuffer;

    implicitGrowth: boolean;
    index : number;
    toHex() : string;
    toArray() : Uint8Array;

    writeCString(data : string) : number;
    writeString(data : string) : number;
    writeFloat(data : number) : ByteBuffer;
    writeDouble(data : number) : ByteBuffer;
    writeInt(data : number) : ByteBuffer;
    writeByte(data : number) : ByteBuffer;
    writeUnsignedInt(data : number) : ByteBuffer;

    seek(amount : number) : ByteBuffer;

    readCString() : string;
    readString(bytes: number) : string;
    readFloat() : number;
    readDouble() : number;
    readInt(endian? : any) : number;
    readByte() : number;
    readUnsignedInt() : number;
    slice(start : number, end : number) : any;

  }
}
