import fs from "fs";

import { v2 as cloudinary } from "cloudinary";
import { FileService } from "medusa-interfaces";

class CloudinaryService extends FileService {
	constructor({}, options) {
		super();

		this.root_ = options.root_folder;
		this.nameToPath_ = options.use_file_name_as_path || false;
		this.nonPublicIdSlashCount_ = 7;

		cloudinary.config({
			cloud_name: options.cloud_name,
			api_key: options.api_key,
			api_secret: options.api_secret,
			secure: options.secure || true,
		});
	}

	// File upload
	upload(file) {
		const publicId = this.buildPublicId(file.originalname);

		return new Promise((resolve, reject) => {
			const upload_stream = cloudinary.uploader.upload_stream(
				{ folder: this.root_, public_id: publicId },
				(err, image) => {
					if (err) {
						console.error(err);
						reject(err);
						return;
					}
					console.log(image.url);
					console.log(image.original_filename);
					const optimisedUrl = this.getOptimisedUrl(image.url, publicId);
					resolve({ url: optimisedUrl });
				},
			);

			fs.createReadStream(file.path).pipe(upload_stream);
		});
	}

	delete(file) {
		// file is the url of image. We have to extract the public id from url
		let publicId;
		if (typeof file === "string" && file.toLowerCase().includes("cloudinary")) {
			publicId = this.extractPublicId(file);
		} else {
			publicId = file;
		}
		cloudinary.uploader.destroy(publicId, function (result) {
			resolve(result);
		});
	}

	/* ------------------------------ helper methods ------------------------------ */

	buildPublicId(originalFileName) {
		const fileName = this.removeExtension(originalFileName);
		const cleanFileName = fileName.replace(/\s+/g, "-"); // convert ' ' to '-'

		const filePath = this.nameToPath_
			? cleanFileName.split(".").join("/")
			: cleanFileName;

		const uniqueSuffix = Date.now();
		return `${filePath}_${uniqueSuffix}`;
	}

	extractPublicId(url) {
		// example: https://res.cloudinary.com/<cloud_name>/image/upload/v1676396191/store/file-name_1676396190050.png
		const cUrl = this.removeExtension(url);
		return cUrl.split("/").slice(this.nonPublicIdSlashCount_).join("/");
	}

	removeExtension(name) {
		return name.split(".").slice(0, -1).join(".");
	}

	getOptimisedUrl(url, publicId) {
		// Replace 'http' with 'https'
		let secureUrl = url.replace("http://", "https://");

		// Find the position to insert the transformation parameters
		const uploadIndex = secureUrl.indexOf("/upload/") + "/upload/".length;

		// Insert the transformation parameters 'f_auto,q_auto'
		//https://res.cloudinary.com/dkqiokfok/image/upload/l_HB-logo,w_100,o_30,e_brightness:200/hb2_1719339368657.jpg

		//https://res.cloudinary.com/demo/image/upload/w_0.2/l_HB-logo,w_200,o_30,e_brightness:200/f_auto,q_auto/mountain.jpg

		secureUrl = secureUrl.slice(0, uploadIndex) + "f_auto,q_auto/" + publicId;
		//	secureUrl.slice(uploadIndex);

		return secureUrl;
	}
}

export default CloudinaryService;
