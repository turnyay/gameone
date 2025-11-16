export function longToByteArray(long: number): number[] {
    const byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let index = 0; index < byteArray.length; index += 1) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return byteArray;
}

export function byteArrayToString(array?: number[] | Uint8Array | undefined): string {
    if (!array || !Array.isArray(array)) return '';
    return array.filter((x) => x !== 0).map((x) => String.fromCharCode(x)).join('');
}

export function trimFundName(fundName: string): string {
    // Remove null characters, spaces, and other whitespace
    return fundName.replace(/\0/g, '').replace(/\s+$/g, '').replace(/^\s+/g, '');
}

export function shortenPublicKey(publicKey: string): string {
    if (publicKey.length <= 10) return publicKey;
    return `${publicKey.slice(0, 5)}...${publicKey.slice(-5)}`;
}

export function stringToByteArray(str: string, length: number): number[] {
    const bytes = new Uint8Array(length);
    const strBytes = new TextEncoder().encode(str);
    bytes.set(strBytes);
    return Array.from(bytes);
} 