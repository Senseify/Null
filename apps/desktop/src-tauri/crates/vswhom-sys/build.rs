fn main() {
    println!("cargo:rustc-link-lib=dylib=OleAut32");
    println!("cargo:rustc-link-lib=dylib=Ole32");
}
