"use client";
/* eslint-disable security/detect-object-injection */
// Array index access is safe here - indices come from internal state management, not user input

import { useState, useCallback } from "react";

export interface UploadedFile {
  file: File;
  preview: string;
}

interface UseFileUploadReturn {
  primaryPhotos: UploadedFile[];
  secondaryPhotos: UploadedFile[];
  handlePrimaryPhotosDrop: (files: File[]) => UploadedFile[];
  handleSecondaryPhotosDrop: (files: File[]) => void;
  removePrimaryPhoto: (index: number) => UploadedFile[];
  removeSecondaryPhoto: (index: number) => void;
  clearAllPhotos: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [primaryPhotos, setPrimaryPhotos] = useState<UploadedFile[]>([]);
  const [secondaryPhotos, setSecondaryPhotos] = useState<UploadedFile[]>([]);

  const handlePrimaryPhotosDrop = useCallback(
    (files: File[]): UploadedFile[] => {
      const newFiles = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      let updatedPhotos: UploadedFile[] = [];
      setPrimaryPhotos((prev) => {
        updatedPhotos = [...prev, ...newFiles];
        return updatedPhotos;
      });

      return updatedPhotos;
    },
    [],
  );

  const handleSecondaryPhotosDrop = useCallback((files: File[]) => {
    const newFiles = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSecondaryPhotos((prev) => [...prev, ...newFiles]);
  }, []);

  const removePrimaryPhoto = useCallback((index: number): UploadedFile[] => {
    let remainingPhotos: UploadedFile[] = [];
    setPrimaryPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      remainingPhotos = newPhotos;
      return newPhotos;
    });
    return remainingPhotos;
  }, []);

  const removeSecondaryPhoto = useCallback((index: number) => {
    setSecondaryPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  }, []);

  const clearAllPhotos = useCallback(() => {
    // Revoke all object URLs to prevent memory leaks
    primaryPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    secondaryPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setPrimaryPhotos([]);
    setSecondaryPhotos([]);
  }, [primaryPhotos, secondaryPhotos]);

  return {
    primaryPhotos,
    secondaryPhotos,
    handlePrimaryPhotosDrop,
    handleSecondaryPhotosDrop,
    removePrimaryPhoto,
    removeSecondaryPhoto,
    clearAllPhotos,
  };
}
