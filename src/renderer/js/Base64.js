export class Base64 {
    /**
     * 加密
     * @param {String} str  
     * @returns 
     */
    static encode(str) {
        return btoa(encodeURI(str))
    }

    /**
     * 解密
     * @param {String} str 
     * @returns 
     */
    static decode(str) {
        return decodeURI(atob(str));
    }

    /**
     * 加密 但是去掉结尾的等号
     * @param {String} str 
     * @returns 
     */
    static encodeNoEqualsSign(str){
        const e_str_t = this.encode(str);
        return (e_str_t.endsWith('=')?e_str_t.replaceAll('=',''):e_str_t) ;  
    }
}