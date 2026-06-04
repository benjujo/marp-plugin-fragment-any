{
  description = "Marpit plugin to fragment any block element via <!-- fragment --> comments";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        marpPluginFragmentAny = pkgs.buildNpmPackage {
          pname = "marp-plugin-fragment-any";
          version = "1.0.0";
          src = ./.;
          npmDepsHash = "sha256-Y2SCc5JN9UMZPKonowU6wU4tMFiYKZt9eIit7LoQbqw=";

          installPhase = ''
            runHook preInstall
            mkdir -p $out/lib/node_modules/marp-plugin-fragment-any
            cp -r dist package.json README.md \
              $out/lib/node_modules/marp-plugin-fragment-any/
            runHook postInstall
          '';
        };
      in
      {
        packages.default = marpPluginFragmentAny;
        packages.marp-plugin-fragment-any = marpPluginFragmentAny;
      });
}
