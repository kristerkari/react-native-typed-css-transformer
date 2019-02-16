var semver = require("semver");
var css2rn = require("css-to-react-native-transform").default;
var DtsCreator = require("typed-css-modules");

var creator = new DtsCreator();
var upstreamTransformer = null;

var reactNativeVersionString = require("react-native/package.json").version;
var reactNativeMinorVersion = semver(reactNativeVersionString).minor;

if (reactNativeMinorVersion >= 59) {
  upstreamTransformer = require("metro-react-native-babel-transformer");
} else if (reactNativeMinorVersion >= 56) {
  upstreamTransformer = require("metro/src/reactNativeTransformer");
} else if (reactNativeMinorVersion >= 52) {
  upstreamTransformer = require("metro/src/transformer");
} else if (reactNativeMinorVersion >= 47) {
  upstreamTransformer = require("metro-bundler/src/transformer");
} else if (reactNativeMinorVersion === 46) {
  upstreamTransformer = require("metro-bundler/build/transformer");
} else {
  // handle RN <= 0.45
  var oldUpstreamTransformer = require("react-native/packager/transformer");
  upstreamTransformer = {
    transform({ src, filename, options }) {
      return oldUpstreamTransformer.transform(src, filename, options);
    }
  };
}

const isPlatformSpecific = filename => {
  const platformSpecific = [".native.css", ".ios.css", ".android.css"];
  return platformSpecific.some(name => filename.endsWith(name));
};

module.exports.transform = function(src, filename, options) {
  if (typeof src === "object") {
    // handle RN >= 0.46
    ({ src, filename, options } = src);
  }

  if (filename.endsWith(".css")) {
    var cssObject = css2rn(src, { parseMediaQueries: true });

    if (isPlatformSpecific(filename)) {
      return upstreamTransformer.transform({
        src: "module.exports = " + JSON.stringify(cssObject),
        filename,
        options
      });
    }
    return creator.create(filename, src).then(content => {
      return content.writeFile().then(() => {
        return upstreamTransformer.transform({
          src: "module.exports = " + JSON.stringify(cssObject),
          filename,
          options
        });
      });
    });
  }
  return upstreamTransformer.transform({ src, filename, options });
};
